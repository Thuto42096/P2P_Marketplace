// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title P2P Stablecoin Marketplace with Escrow
/// @notice Lets sellers list items priced in ERC-20 stablecoins and buyers
///         purchase via a smart contract escrow that releases funds only on
///         buyer confirmation, seller refund, or admin dispute resolution.
contract Marketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum ListingStatus { Active, Paused, InEscrow, Sold, Cancelled }
    enum EscrowStatus { None, Pending, Released, Refunded, Disputed }

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

    uint256 public nextListingId = 1;
    uint256 public nextEscrowId = 1;

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => Escrow) private _escrows;
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

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

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
        require(bytes(name).length > 0, "name empty");
        require(allowedTokens[paymentToken], "token not allowed");

        id = nextListingId++;
        _listings[id] = Listing({
            id: id,
            seller: msg.sender,
            name: name,
            description: description,
            price: price,
            imageURI: imageURI,
            paymentToken: paymentToken,
            status: ListingStatus.Active,
            activeEscrowId: 0
        });
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
        Listing storage l = _listings[id];
        require(l.seller == msg.sender, "not seller");
        require(
            l.status == ListingStatus.Active || l.status == ListingStatus.Paused,
            "not editable"
        );
        require(price > 0, "price=0");
        require(bytes(name).length > 0, "name empty");
        require(allowedTokens[paymentToken], "token not allowed");

        l.name = name;
        l.description = description;
        l.price = price;
        l.imageURI = imageURI;
        l.paymentToken = paymentToken;
        emit ListingUpdated(id);
    }

    function setListingPaused(uint256 id, bool paused) external {
        Listing storage l = _listings[id];
        require(l.seller == msg.sender, "not seller");
        require(
            l.status == ListingStatus.Active || l.status == ListingStatus.Paused,
            "locked"
        );
        l.status = paused ? ListingStatus.Paused : ListingStatus.Active;
        emit ListingStatusChanged(id, l.status);
    }

    function cancelListing(uint256 id) external {
        Listing storage l = _listings[id];
        require(l.seller == msg.sender, "not seller");
        require(
            l.status == ListingStatus.Active || l.status == ListingStatus.Paused,
            "cannot cancel"
        );
        l.status = ListingStatus.Cancelled;
        emit ListingStatusChanged(id, l.status);
    }

    // ---------------------------------------------------------------------
    // Buying / Escrow
    // ---------------------------------------------------------------------

    function buyItem(uint256 listingId)
        external
        nonReentrant
        returns (uint256 escrowId)
    {
        Listing storage l = _listings[listingId];
        require(l.status == ListingStatus.Active, "not active");
        require(msg.sender != l.seller, "seller cannot buy");

        escrowId = nextEscrowId++;
        _escrows[escrowId] = Escrow({
            id: escrowId,
            listingId: listingId,
            buyer: msg.sender,
            seller: l.seller,
            paymentToken: l.paymentToken,
            amount: l.price,
            status: EscrowStatus.Pending,
            createdAt: block.timestamp
        });

        l.status = ListingStatus.InEscrow;
        l.activeEscrowId = escrowId;

        IERC20(l.paymentToken).safeTransferFrom(msg.sender, address(this), l.price);
        emit EscrowOpened(escrowId, listingId, msg.sender, l.price);
    }

    function confirmReceipt(uint256 escrowId) external nonReentrant {
        Escrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "not pending");
        require(e.buyer == msg.sender, "not buyer");

        e.status = EscrowStatus.Released;
        Listing storage l = _listings[e.listingId];
        l.status = ListingStatus.Sold;
        l.activeEscrowId = 0;

        IERC20(e.paymentToken).safeTransfer(e.seller, e.amount);
        emit EscrowReleased(escrowId, e.seller, e.amount);
    }

    function refundBuyer(uint256 escrowId) external nonReentrant {
        Escrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "not pending");
        require(e.seller == msg.sender, "not seller");

        e.status = EscrowStatus.Refunded;
        Listing storage l = _listings[e.listingId];
        l.status = ListingStatus.Active;
        l.activeEscrowId = 0;

        IERC20(e.paymentToken).safeTransfer(e.buyer, e.amount);
        emit EscrowRefunded(escrowId, e.buyer, e.amount);
    }

    function raiseDispute(uint256 escrowId) external {
        Escrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "not pending");
        require(msg.sender == e.buyer || msg.sender == e.seller, "not party");
        e.status = EscrowStatus.Disputed;
        emit DisputeRaised(escrowId, msg.sender);
    }

    function resolveDispute(uint256 escrowId, bool releaseToSeller)
        external
        onlyOwner
        nonReentrant
    {
        Escrow storage e = _escrows[escrowId];
        require(e.status == EscrowStatus.Disputed, "not disputed");
        Listing storage l = _listings[e.listingId];

        if (releaseToSeller) {
            e.status = EscrowStatus.Released;
            l.status = ListingStatus.Sold;
            l.activeEscrowId = 0;
            IERC20(e.paymentToken).safeTransfer(e.seller, e.amount);
            emit EscrowReleased(escrowId, e.seller, e.amount);
        } else {
            e.status = EscrowStatus.Refunded;
            l.status = ListingStatus.Cancelled;
            l.activeEscrowId = 0;
            IERC20(e.paymentToken).safeTransfer(e.buyer, e.amount);
            emit EscrowRefunded(escrowId, e.buyer, e.amount);
        }
        emit DisputeResolved(escrowId, releaseToSeller);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getListing(uint256 id) external view returns (Listing memory) {
        return _listings[id];
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        return _escrows[id];
    }

    function getAllListings() external view returns (Listing[] memory all) {
        uint256 total = nextListingId - 1;
        all = new Listing[](total);
        for (uint256 i = 0; i < total; i++) {
            all[i] = _listings[i + 1];
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
                active[j++] = _listings[i];
            }
        }
    }
}
