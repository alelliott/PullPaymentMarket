import { ethers } from "hardhat";

async function main() {

  const [deployer] = await ethers.getSigners();
  
  const feeBasisPoints = 100; // Set fee to 1% (100 basis points)
  const feeRecipient = deployer.address; // set fee recipient to the deployer 

  console.log("Deploying the contracts with the account:", deployer.address);
  
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const PullPaymentMarket = await ethers.getContractFactory("PullPaymentMarket");
  const market = await PullPaymentMarket.deploy(feeBasisPoints, feeRecipient);
  await market.waitForDeployment();
  console.log("PullPaymentMarket Contract Address:", market.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
