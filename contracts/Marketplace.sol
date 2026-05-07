// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title P2P Stablecoin Marketplace with Escrow
/// @notice Lets sellers list items priced in ERC-20 stablecoins and buyers
///         purchase via a smart contract escrow that releases funds only on
///         buyer confirmation, seller refund, or admin dispute resolution.
/// @dev    UUPS-upgradeable. Deploy behind an ERC1967 proxy and call
///         `initialize(initialOwner)`.
contract Marketplace is
    Initializable,
    ReentrancyGuard,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    enum ListingStatus { Active, Paused, InEscrow, Sold, Cancelled }
    enum EscrowStatus { None, Pending, Released, Refunded, Disputed }

    /// @dev Public/ABI-stable view shape returned by `getListing` etc.
    struct Listing {
        uint256 id;
        address seller;
        string name;
        string description;
        uint256 price;
        string imageURI;
        address paymentToken;
        ListingStatus status;
        uint256 activeEscrowId;
    }

    /// @dev Public/ABI-stable view shape returned by `getEscrow`.
    struct Escrow {
        uint256 id;
        uint256 listingId;
        address buyer;
        address seller;
        address paymentToken;
        uint256 amount;
        EscrowStatus status;
        uint256 createdAt;
    }

    /// @dev Packed storage layout. Slot A: seller(20) + activeEscrowId(11) +
    ///      status(1). Slot B: paymentToken(20) + price(12). Strings each
    ///      occupy their own slot(s).
    struct _StoredListing {
        address seller;
        uint88 activeEscrowId;
        ListingStatus status;
        address paymentToken;
        uint96 price;
        string name;
        string description;
        string imageURI;
    }

    /// @dev Packed storage layout — single 32-byte slot:
    ///      buyer(20) + listingId(6) + createdAt(5) + status(1).
    struct _StoredEscrow {
        address buyer;
        uint48 listingId;
        uint40 createdAt;
        EscrowStatus status;
    }

    uint256 public nextListingId;
    uint256 public nextEscrowId;

    mapping(uint256 => _StoredListing) private _listings;
    mapping(uint256 => _StoredEscrow) private _escrows;
    mapping(address => bool) public allowedTokens;

    event TokenAllowed(address indexed token, bool allowed);
    event ListingCreated(
        uint256 indexed id,
        address indexed seller,
        address indexed paymentToken,
        uint256 price
    );
    event ListingUpdated(uint256 indexed id);
    event ListingStatusChanged(uint256 indexed id, ListingStatus status);
    event EscrowOpened(
        uint256 indexed escrowId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount
    );
    event EscrowReleased(uint256 indexed escrowId, address indexed seller, uint256 amount);
    event EscrowRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event DisputeRaised(uint256 indexed escrowId, address indexed by);
    event DisputeResolved(uint256 indexed escrowId, bool releasedToSeller);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);

        nextListingId = 1;
        nextEscrowId = 1;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        require(token != address(0), "zero token");
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    // ---------------------------------------------------------------------
    // Listing management
    // ---------------------------------------------------------------------

    function createListing(
        string calldata name,
        string calldata description,
        uint256 price,
        string calldata imageURI,
        address paymentToken
    ) external returns (uint256 id) {
        require(price > 0, "price=0");
        require(price <= type(uint96).max, "price overflow");
        require(bytes(name).length > 0, "name empty");
        require(allowedTokens[paymentToken], "token not allowed");

        unchecked { id = nextListingId++; }
        _StoredListing storage l = _listings[id];
        l.seller = msg.sender;
        l.activeEscrowId = 0;
        l.status = ListingStatus.Active;
        l.paymentToken = paymentToken;
        l.price = uint96(price);
        l.name = name;
        l.description = description;
        l.imageURI = imageURI;
        emit ListingCreated(id, msg.sender, paymentToken, price);
    }

    function updateListing(
        uint256 id,
        string calldata name,
        string calldata description,
        uint256 price,
        string calldata imageURI,
        address paymentToken
    ) external {
        _StoredListing storage l = _listings[id];
        require(l.seller == msg.sender, "not seller");
        require(
            l.status == ListingStatus.Active || l.status == ListingStatus.Paused,
            "not editable"
        );
        require(price > 0, "price=0");
        require(price <= type(uint96).max, "price overflow");
        require(bytes(name).length > 0, "name empty");
        require(allowedTokens[paymentToken], "token not allowed");

        l.name = name;
        l.description = description;
        l.price = uint96(price);
        l.imageURI = imageURI;
        l.paymentToken = paymentToken;
        emit ListingUpdated(id);
    }

    function setListingPaused(uint256 id, bool paused) external {
        _StoredListing storage l = _listings[id];
        require(l.seller == msg.sender, "not seller");
        ListingStatus s = l.status;
        require(s == ListingStatus.Active || s == ListingStatus.Paused, "locked");
        ListingStatus next = paused ? ListingStatus.Paused : ListingStatus.Active;
        l.status = next;
        emit ListingStatusChanged(id, next);
    }

    function cancelListing(uint256 id) external {
        _StoredListing storage l = _listings[id];
        require(l.seller == msg.sender, "not seller");
        ListingStatus s = l.status;
        require(s == ListingStatus.Active || s == ListingStatus.Paused, "cannot cancel");
        l.status = ListingStatus.Cancelled;
        emit ListingStatusChanged(id, ListingStatus.Cancelled);
    }

    // ---------------------------------------------------------------------
    // Buying / Escrow
    // ---------------------------------------------------------------------

    function buyItem(uint256 listingId)
        external
        nonReentrant
        returns (uint256 escrowId)
    {
        require(listingId <= type(uint48).max, "listingId overflow");
        _StoredListing storage l = _listings[listingId];
        address seller = l.seller;
        require(l.status == ListingStatus.Active, "not active");
        require(msg.sender != seller, "seller cannot buy");

        address token = l.paymentToken;
        uint256 amount = l.price;

        unchecked { escrowId = nextEscrowId++; }
        require(escrowId <= type(uint88).max, "escrowId overflow");

        // Single packed SSTORE: buyer + listingId + createdAt + status all in one slot.
        _StoredEscrow storage e = _escrows[escrowId];
        e.buyer = msg.sender;
        e.listingId = uint48(listingId);
        e.createdAt = uint40(block.timestamp);
        e.status = EscrowStatus.Pending;

        // Slot A of the listing already holds seller; status + activeEscrowId
        // are in the same slot, so this is a single warm SSTORE.
        l.status = ListingStatus.InEscrow;
        l.activeEscrowId = uint88(escrowId);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit EscrowOpened(escrowId, listingId, msg.sender, amount);
    }

    function confirmReceipt(uint256 escrowId) external nonReentrant {
        _StoredEscrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "not pending");
        require(e.buyer == msg.sender, "not buyer");

        uint256 listingId = e.listingId;
        _StoredListing storage l = _listings[listingId];
        address seller = l.seller;
        address token = l.paymentToken;
        uint256 amount = l.price;

        e.status = EscrowStatus.Released;
        l.status = ListingStatus.Sold;
        l.activeEscrowId = 0;

        IERC20(token).safeTransfer(seller, amount);
        emit EscrowReleased(escrowId, seller, amount);
    }

    function refundBuyer(uint256 escrowId) external nonReentrant {
        _StoredEscrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "not pending");

        uint256 listingId = e.listingId;
        _StoredListing storage l = _listings[listingId];
        require(l.seller == msg.sender, "not seller");
        address buyer = e.buyer;
        address token = l.paymentToken;
        uint256 amount = l.price;

        e.status = EscrowStatus.Refunded;
        l.status = ListingStatus.Active;
        l.activeEscrowId = 0;

        IERC20(token).safeTransfer(buyer, amount);
        emit EscrowRefunded(escrowId, buyer, amount);
    }

    function raiseDispute(uint256 escrowId) external {
        _StoredEscrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "not pending");
        address seller = _listings[e.listingId].seller;
        require(msg.sender == e.buyer || msg.sender == seller, "not party");
        e.status = EscrowStatus.Disputed;
        emit DisputeRaised(escrowId, msg.sender);
    }

    function resolveDispute(uint256 escrowId, bool releaseToSeller)
        external
        onlyOwner
        nonReentrant
    {
        _StoredEscrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Disputed, "not disputed");

        _StoredListing storage l = _listings[e.listingId];
        address seller = l.seller;
        address buyer = e.buyer;
        address token = l.paymentToken;
        uint256 amount = l.price;

        if (releaseToSeller) {
            e.status = EscrowStatus.Released;
            l.status = ListingStatus.Sold;
            l.activeEscrowId = 0;
            IERC20(token).safeTransfer(seller, amount);
            emit EscrowReleased(escrowId, seller, amount);
        } else {
            e.status = EscrowStatus.Refunded;
            l.status = ListingStatus.Cancelled;
            l.activeEscrowId = 0;
            IERC20(token).safeTransfer(buyer, amount);
            emit EscrowRefunded(escrowId, buyer, amount);
        }
        emit DisputeResolved(escrowId, releaseToSeller);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getListing(uint256 id) external view returns (Listing memory) {
        return _toListingView(id);
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        _StoredEscrow storage e = _escrows[id];
        if (e.status == EscrowStatus.None) {
            return Escrow(0, 0, address(0), address(0), address(0), 0, EscrowStatus.None, 0);
        }
        _StoredListing storage l = _listings[e.listingId];
        return Escrow({
            id: id,
            listingId: e.listingId,
            buyer: e.buyer,
            seller: l.seller,
            paymentToken: l.paymentToken,
            amount: l.price,
            status: e.status,
            createdAt: e.createdAt
        });
    }

    function getAllListings() external view returns (Listing[] memory all) {
        uint256 total = nextListingId - 1;
        all = new Listing[](total);
        for (uint256 i = 0; i < total; i++) {
            all[i] = _toListingView(i + 1);
        }
    }

    function getActiveListings() external view returns (Listing[] memory active) {
        uint256 total = nextListingId - 1;
        uint256 count;
        for (uint256 i = 1; i <= total; i++) {
            if (_listings[i].status == ListingStatus.Active) count++;
        }
        active = new Listing[](count);
        uint256 j;
        for (uint256 i = 1; i <= total; i++) {
            if (_listings[i].status == ListingStatus.Active) {
                active[j++] = _toListingView(i);
            }
        }
    }

    /// @dev Reconstructs the public `Listing` view shape from packed storage.
    ///      Returns an all-zero struct (id == 0) when the slot is empty so
    ///      callers can detect non-existent listings.
    function _toListingView(uint256 id) private view returns (Listing memory v) {
        _StoredListing storage l = _listings[id];
        if (l.seller == address(0)) {
            return v;
        }
        v.id = id;
        v.seller = l.seller;
        v.name = l.name;
        v.description = l.description;
        v.price = l.price;
        v.imageURI = l.imageURI;
        v.paymentToken = l.paymentToken;
        v.status = l.status;
        v.activeEscrowId = l.activeEscrowId;
    }

    /// @dev Reserved storage slots for future upgrades.
    uint256[50] private __gap;
}
