import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, parseEther, parseUnits } from "ethers";


describe("PullPaymentMarket", function () {
  let PullPaymentMarket: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;
  let ownerAddress: string;
  let addr1Address: string;
  let addr2Address: string;
  let feeBasisPoints = 100; // 1%

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    addr1Address = await addr1.getAddress();
    addr2Address = await addr2.getAddress();

    const PullPaymentMarketFactory = await ethers.getContractFactory("PullPaymentMarket");
    PullPaymentMarket = await PullPaymentMarketFactory.deploy(feeBasisPoints, ownerAddress);
    await PullPaymentMarket.waitForDeployment();
  });

  it("Should deploy with the correct owner, fee, and fee recipient", async function () {
    expect(await PullPaymentMarket.owner()).to.equal(ownerAddress);
    expect(await PullPaymentMarket.feeRecipient()).to.equal(ownerAddress);
    expect(await PullPaymentMarket.feeBasisPoints()).to.equal(feeBasisPoints);
  });

  it("Should allow the owner to update fee basis points and recipient, but not non-owners", async function () {
    // As owner
    await PullPaymentMarket.connect(owner).updateFeeBasisPoints(200);
    expect(await PullPaymentMarket.feeBasisPoints()).to.equal(200);

    await PullPaymentMarket.connect(owner).updateFeeRecipient(addr1Address);
    expect(await PullPaymentMarket.feeRecipient()).to.equal(addr1Address);

    // As non-owner
    await expect(
      PullPaymentMarket.connect(addr1).updateFeeBasisPoints(200)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(
      PullPaymentMarket.connect(addr1).updateFeeRecipient(addr2Address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should allow the owner to add and remove whitelisted tokens, but not non-owners", async function () {
    const USDCAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    // As owner
    await PullPaymentMarket.connect(owner).addToWhitelist(USDCAddress);
    expect(await PullPaymentMarket.whitelistedTokens(USDCAddress)).to.equal(true);

    await PullPaymentMarket.connect(owner).removeFromWhitelist(USDCAddress);
    expect(await PullPaymentMarket.whitelistedTokens(USDCAddress)).to.equal(false);

    // As non-owner
    await expect(
      PullPaymentMarket.connect(addr1).addToWhitelist(USDCAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(
      PullPaymentMarket.connect(addr1).removeFromWhitelist(USDCAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should allow the owner to register and update vendors, but not non-owners", async function () {
    const vendorId = 1;
    const vendorAddress = addr1Address;
    const vendorAddress2 = ethers.Wallet.createRandom().address;

    // As owner
    await expect(
      PullPaymentMarket.connect(owner).registerVendor(vendorId, vendorAddress)
    )
      .to.emit(PullPaymentMarket, "VendorRegistered")
      .withArgs(vendorId, vendorAddress);
    expect(await PullPaymentMarket.vendors(vendorId)).to.equal(vendorAddress);

    await expect(
      PullPaymentMarket.connect(owner).updateVendorAddress(vendorId, vendorAddress2)
    ).to.not.be.reverted;
    expect(await PullPaymentMarket.vendors(vendorId)).to.equal(vendorAddress2);

    // As non-owner
    await expect(
      PullPaymentMarket.connect(addr1).registerVendor(2, vendorAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(
      PullPaymentMarket.connect(addr1).updateVendorAddress(vendorId, vendorAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should allow purchases with ERC20 token", async function () {
    const vendorId = 1;
    const orderId = 1;
    const vendorAddress = addr1Address;
    const customer = addr2;
    const customerAddress = addr2Address;
    const purchaseAmount = parseUnits("10", 6);
    const fee = (purchaseAmount * BigInt(feeBasisPoints)) / BigInt(10000);
    const amountAfterFee = purchaseAmount - fee;

    // Register a vendor, addr1
    await PullPaymentMarket.connect(owner).registerVendor(vendorId, vendorAddress);
    expect(await PullPaymentMarket.vendors(vendorId)).to.equal(vendorAddress);

    // Deploy a mock ERC20 token to a customer
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const TUSD = await ERC20Factory.connect(customer).deploy("TUSD", "TUSD");
    const initialCustomerBalance = await TUSD.balanceOf(customerAddress);
    
    // Add the mock token to the PullPaymentMarket whitelist
    await PullPaymentMarket.connect(owner).addToWhitelist(TUSD.target);
    expect(await PullPaymentMarket.whitelistedTokens(TUSD.target)).to.equal(true);

    // Approve token
    await TUSD.connect(customer).approve(PullPaymentMarket.target, purchaseAmount);

    // Purchase with ERC20
    await expect(
      PullPaymentMarket.connect(customer).purchaseWithERC20(
        vendorId,
        orderId,
        purchaseAmount,
        TUSD.target
      )
    )
      .to.emit(PullPaymentMarket, "Purchase")
      .withArgs(
        customerAddress,
        vendorId,
        orderId,
        amountAfterFee,
        TUSD.target
      );

    // Verify balances
    expect(await PullPaymentMarket.tokenBalances(TUSD.target, vendorAddress)).to.equal(amountAfterFee);
    expect(await PullPaymentMarket.tokenBalances(TUSD.target, ownerAddress)).to.equal(fee);
    expect(await TUSD.balanceOf(customerAddress)).to.equal(initialCustomerBalance - purchaseAmount);
  });

  it("Should allow purchases with Ether", async function () {
    const vendorId = 1;
    const vendorAddress = addr1Address;
    const customer = addr2;
    const customerAddress = addr2Address;
    const purchaseAmount = parseEther("1");
    const fee = (purchaseAmount * BigInt(feeBasisPoints)) / BigInt(10000);
    const amountAfterFee = purchaseAmount - fee;
    const orderId = 1;

    // Register a vendor, addr1
    await PullPaymentMarket.connect(owner).registerVendor(vendorId, vendorAddress);
    expect(await PullPaymentMarket.vendors(vendorId)).to.equal(vendorAddress);

    const initialCustomerBalance = await ethers.provider.getBalance(customerAddress);

    // Purchase
    await expect(
      PullPaymentMarket.connect(customer).purchaseWithEther(vendorId, orderId, {
        value: purchaseAmount,
      })
    )
      .to.emit(PullPaymentMarket, "Purchase")
      .withArgs(
        customerAddress,
        vendorId,
        orderId,
        amountAfterFee,
        "0x0000000000000000000000000000000000000000"
      );

    // Verify balances
    const vendorPayments = await PullPaymentMarket.payments(vendorAddress);
    expect(vendorPayments).to.equal(amountAfterFee);
    
    const feeRecipientPayments = await PullPaymentMarket.payments(ownerAddress);
    expect(feeRecipientPayments).to.equal(fee);
    
    expect(await ethers.provider.getBalance(customerAddress)).to.be.lt(initialCustomerBalance - purchaseAmount);
  });

  it('Should transfer ownership correctly', async function () {
    const newOwnerAddress = addr1Address;
    expect(await PullPaymentMarket.owner()).to.equal(ownerAddress);

    await PullPaymentMarket.connect(owner).transferOwnership(newOwnerAddress);
    expect(await PullPaymentMarket.owner()).to.equal(newOwnerAddress);
  });
  
  it("Should reject ERC20 purchases with 0 amount", async function () {
    const vendorId = 1;
    const orderId = 1;
    const vendorAddress = addr1Address;
    const customer = addr2;
    const customerAddress = addr2Address;
    const purchaseAmount = parseUnits("0", 6);
  
    // Register a vendor, addr1
    await PullPaymentMarket.connect(owner).registerVendor(vendorId, vendorAddress);
    expect(await PullPaymentMarket.vendors(vendorId)).to.equal(vendorAddress);
  
    // Deploy a mock ERC20 token to a customer
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const TUSD = await ERC20Factory.connect(customer).deploy("TUSD", "TUSD");
  
    // Add the mock token to the PullPaymentMarket whitelist
    await PullPaymentMarket.connect(owner).addToWhitelist(TUSD.target);
    expect(await PullPaymentMarket.whitelistedTokens(TUSD.target)).to.equal(true);
  
    // Approve token
    await TUSD.connect(customer).approve(PullPaymentMarket.target, purchaseAmount);
  
    // Attempt purchase with ERC20 with 0 amount
    await expect(
      PullPaymentMarket.connect(customer).purchaseWithERC20(
        vendorId,
        orderId,
        purchaseAmount,
        TUSD.target
      )
    ).to.be.revertedWith("Amount must be greater than zero");
  });
  
  it("Should reject Ether purchases with 0 amount", async function () {
    const vendorId = 1;
    const vendorAddress = addr1Address;
    const customer = addr2;
    const customerAddress = addr2Address;
    const purchaseAmount = parseEther("0");
    const orderId = 1;
  
    // Register a vendor, addr1
    await PullPaymentMarket.connect(owner).registerVendor(vendorId, vendorAddress);
    expect(await PullPaymentMarket.vendors(vendorId)).to.equal(vendorAddress);
  
    // Attempt Ether purchase with 0 amount
    await expect(
      PullPaymentMarket.connect(customer).purchaseWithEther(vendorId, orderId, {
        value: purchaseAmount,
      })
    ).to.be.revertedWith("Amount must be greater than zero");
  });

});
