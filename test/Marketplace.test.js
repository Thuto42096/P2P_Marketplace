const { expect } = require("chai");
const { ethers } = require("hardhat");

const PRICE = 100n * 10n ** 6n; // 100 mUSDC (6 decimals)
const MINT_AMOUNT = 1_000n * 10n ** 6n;

const ListingStatus = {
  Active: 0,
  Paused: 1,
  InEscrow: 2,
  Sold: 3,
  Cancelled: 4,
};
const EscrowStatus = {
  None: 0,
  Pending: 1,
  Released: 2,
  Refunded: 3,
  Disputed: 4,
};

async function deployFixture() {
  const [owner, seller, buyer, other] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
  await usdc.waitForDeployment();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(owner.address);
  await marketplace.waitForDeployment();

  await marketplace.connect(owner).setTokenAllowed(await usdc.getAddress(), true);

  await usdc.mint(buyer.address, MINT_AMOUNT);
  await usdc.mint(other.address, MINT_AMOUNT);

  return { owner, seller, buyer, other, usdc, marketplace };
}

async function createListing(marketplace, usdc, seller, price = PRICE) {
  const tx = await marketplace
    .connect(seller)
    .createListing(
      "Vintage Camera",
      "Mint condition film camera.",
      price,
      "ipfs://QmExampleHash",
      await usdc.getAddress()
    );
  const receipt = await tx.wait();
  // Listing id == 1 for the first call; return it explicitly.
  return 1n;
}

describe("Marketplace - deployment & admin", function () {
  it("sets the deployer-supplied owner", async function () {
    const { marketplace, owner } = await deployFixture();
    expect(await marketplace.owner()).to.equal(owner.address);
  });

  it("only owner can whitelist tokens", async function () {
    const { marketplace, seller, usdc } = await deployFixture();
    await expect(
      marketplace.connect(seller).setTokenAllowed(await usdc.getAddress(), true)
    ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
  });

  it("rejects the zero address as a payment token", async function () {
    const { marketplace, owner } = await deployFixture();
    await expect(
      marketplace.connect(owner).setTokenAllowed(ethers.ZeroAddress, true)
    ).to.be.revertedWith("zero token");
  });
});

describe("Marketplace - listings", function () {
  it("creates a listing with valid input", async function () {
    const { marketplace, usdc, seller } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);

    const listing = await marketplace.getListing(id);
    expect(listing.seller).to.equal(seller.address);
    expect(listing.price).to.equal(PRICE);
    expect(listing.status).to.equal(ListingStatus.Active);
    expect(listing.paymentToken).to.equal(await usdc.getAddress());
  });

  it("rejects creation with non-whitelisted token", async function () {
    const { marketplace, seller } = await deployFixture();
    const Other = await ethers.getContractFactory("MockERC20");
    const bogus = await Other.deploy("Bogus", "BOG", 18);
    await bogus.waitForDeployment();
    await expect(
      marketplace
        .connect(seller)
        .createListing("x", "x", PRICE, "uri", await bogus.getAddress())
    ).to.be.revertedWith("token not allowed");
  });

  it("rejects zero price and empty name", async function () {
    const { marketplace, usdc, seller } = await deployFixture();
    await expect(
      marketplace
        .connect(seller)
        .createListing("x", "x", 0, "uri", await usdc.getAddress())
    ).to.be.revertedWith("price=0");
    await expect(
      marketplace
        .connect(seller)
        .createListing("", "x", PRICE, "uri", await usdc.getAddress())
    ).to.be.revertedWith("name empty");
  });

  it("only the seller can update or pause a listing", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    await expect(
      marketplace
        .connect(buyer)
        .updateListing(id, "x", "x", PRICE, "uri", await usdc.getAddress())
    ).to.be.revertedWith("not seller");
    await expect(marketplace.connect(buyer).setListingPaused(id, true)).to.be
      .revertedWith("not seller");
  });

  it("seller can pause and unpause", async function () {
    const { marketplace, usdc, seller } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);

    await marketplace.connect(seller).setListingPaused(id, true);
    expect((await marketplace.getListing(id)).status).to.equal(ListingStatus.Paused);

    await marketplace.connect(seller).setListingPaused(id, false);
    expect((await marketplace.getListing(id)).status).to.equal(ListingStatus.Active);
  });

  it("seller can cancel an active listing", async function () {
    const { marketplace, usdc, seller } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    await marketplace.connect(seller).cancelListing(id);
    expect((await marketplace.getListing(id)).status).to.equal(ListingStatus.Cancelled);
  });
});

module.exports = { deployFixture, createListing, PRICE, ListingStatus, EscrowStatus };
