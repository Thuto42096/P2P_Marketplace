const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  deployFixture,
  createListing,
  PRICE,
  ListingStatus,
  EscrowStatus,
} = require("./Marketplace.test.js");

async function buy(marketplace, usdc, buyer, listingId) {
  await usdc.connect(buyer).approve(await marketplace.getAddress(), PRICE);
  await marketplace.connect(buyer).buyItem(listingId);
  return 1n; // first escrow id
}

describe("Marketplace - escrow happy path", function () {
  it("locks funds in the contract on purchase", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    await usdc.connect(buyer).approve(await marketplace.getAddress(), PRICE);

    await expect(marketplace.connect(buyer).buyItem(id))
      .to.emit(marketplace, "EscrowOpened")
      .withArgs(1n, id, buyer.address, PRICE);

    expect(await usdc.balanceOf(await marketplace.getAddress())).to.equal(PRICE);
    const listing = await marketplace.getListing(id);
    expect(listing.status).to.equal(ListingStatus.InEscrow);
    expect(listing.activeEscrowId).to.equal(1n);
  });

  it("seller cannot buy their own listing", async function () {
    const { marketplace, usdc, seller } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    await usdc.mint(seller.address, PRICE);
    await usdc.connect(seller).approve(await marketplace.getAddress(), PRICE);
    await expect(marketplace.connect(seller).buyItem(id)).to.be.revertedWith(
      "seller cannot buy"
    );
  });

  it("paused listings cannot be purchased", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    await marketplace.connect(seller).setListingPaused(id, true);
    await usdc.connect(buyer).approve(await marketplace.getAddress(), PRICE);
    await expect(marketplace.connect(buyer).buyItem(id)).to.be.revertedWith(
      "not active"
    );
  });

  it("releases funds to the seller on confirmReceipt", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);

    const sellerBefore = await usdc.balanceOf(seller.address);
    await expect(marketplace.connect(buyer).confirmReceipt(escrowId))
      .to.emit(marketplace, "EscrowReleased")
      .withArgs(escrowId, seller.address, PRICE);
    const sellerAfter = await usdc.balanceOf(seller.address);

    expect(sellerAfter - sellerBefore).to.equal(PRICE);
    expect(await usdc.balanceOf(await marketplace.getAddress())).to.equal(0n);

    const listing = await marketplace.getListing(id);
    expect(listing.status).to.equal(ListingStatus.Sold);
    expect(listing.activeEscrowId).to.equal(0n);

    const escrow = await marketplace.getEscrow(escrowId);
    expect(escrow.status).to.equal(EscrowStatus.Released);
  });

  it("only the buyer can release funds", async function () {
    const { marketplace, usdc, seller, buyer, other } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);
    await expect(
      marketplace.connect(other).confirmReceipt(escrowId)
    ).to.be.revertedWith("not buyer");
    await expect(
      marketplace.connect(seller).confirmReceipt(escrowId)
    ).to.be.revertedWith("not buyer");
  });
});

describe("Marketplace - refund & dispute", function () {
  it("seller can refund the buyer; listing returns to Active", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);

    const buyerBefore = await usdc.balanceOf(buyer.address);
    await expect(marketplace.connect(seller).refundBuyer(escrowId))
      .to.emit(marketplace, "EscrowRefunded")
      .withArgs(escrowId, buyer.address, PRICE);
    const buyerAfter = await usdc.balanceOf(buyer.address);

    expect(buyerAfter - buyerBefore).to.equal(PRICE);
    expect((await marketplace.getListing(id)).status).to.equal(ListingStatus.Active);
    expect((await marketplace.getEscrow(escrowId)).status).to.equal(
      EscrowStatus.Refunded
    );
  });

  it("non-seller cannot refund", async function () {
    const { marketplace, usdc, seller, buyer, other } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);
    await expect(
      marketplace.connect(other).refundBuyer(escrowId)
    ).to.be.revertedWith("not seller");
    await expect(
      marketplace.connect(buyer).refundBuyer(escrowId)
    ).to.be.revertedWith("not seller");
  });

  it("either party can raise a dispute", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);

    await expect(marketplace.connect(seller).raiseDispute(escrowId))
      .to.emit(marketplace, "DisputeRaised")
      .withArgs(escrowId, seller.address);
    expect((await marketplace.getEscrow(escrowId)).status).to.equal(
      EscrowStatus.Disputed
    );
  });

  it("admin resolves dispute in favor of seller", async function () {
    const { marketplace, usdc, owner, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);
    await marketplace.connect(buyer).raiseDispute(escrowId);

    const sellerBefore = await usdc.balanceOf(seller.address);
    await expect(marketplace.connect(owner).resolveDispute(escrowId, true))
      .to.emit(marketplace, "DisputeResolved")
      .withArgs(escrowId, true);
    expect((await usdc.balanceOf(seller.address)) - sellerBefore).to.equal(PRICE);
    expect((await marketplace.getListing(id)).status).to.equal(ListingStatus.Sold);
  });

  it("admin resolves dispute in favor of buyer", async function () {
    const { marketplace, usdc, owner, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);
    await marketplace.connect(seller).raiseDispute(escrowId);

    const buyerBefore = await usdc.balanceOf(buyer.address);
    await marketplace.connect(owner).resolveDispute(escrowId, false);
    expect((await usdc.balanceOf(buyer.address)) - buyerBefore).to.equal(PRICE);
    expect((await marketplace.getListing(id)).status).to.equal(
      ListingStatus.Cancelled
    );
  });

  it("non-admin cannot resolve disputes", async function () {
    const { marketplace, usdc, seller, buyer } = await deployFixture();
    const id = await createListing(marketplace, usdc, seller);
    const escrowId = await buy(marketplace, usdc, buyer, id);
    await marketplace.connect(buyer).raiseDispute(escrowId);
    await expect(
      marketplace.connect(seller).resolveDispute(escrowId, true)
    ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
  });
});
