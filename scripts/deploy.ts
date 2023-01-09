import { ethers } from "hardhat";
import { Signer } from "ethers";

async function main() {
  let depositAmount = ethers.utils.parseUnits("0.00001", "ether");

  let proposalNames: string[] = ["Joko Widodo", "Vladimir Putin", "Joe Biden"];

  let interval: number = 3;
  let startTime: number = Math.floor(Date.now() / 1000);
  let endTime: number = Math.floor(Date.now() / 1000) + interval;

  const signers: Signer[] = await ethers.getSigners();
  const owner = signers[0];
  const voters = signers.slice(1, signers.length);
  let voterAddresses = [];

  const ballotFactory = await ethers.getContractFactory("Ballot");
  const ballot = await ballotFactory.deploy(
    proposalNames,
    startTime,
    endTime,
    voterAddresses,
    { value: depositAmount }
  );

  await ballot.deployed();

  console.log(`Ballot with 0.00001 ETH deployed to ${ballot.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
