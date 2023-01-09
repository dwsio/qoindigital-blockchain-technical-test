import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";

import jsonBallot from "../artifacts/contracts/Ballot.sol/Ballot.json";

describe("Ballot", () => {
  async function deployBallotFixture() {
    let depositAmount = ethers.utils.parseUnits("0.00001", "ether");

    let proposalNames: string[] = [
      "Joko Widodo",
      "Vladimir Putin",
      "Joe Biden",
    ];

    let interval: number = 3;
    let startTime: number = Math.floor(Date.now() / 1000);
    let endTime: number = Math.floor(Date.now() / 1000) + interval;

    const signers: Signer[] = await ethers.getSigners();
    const owner = signers[0];
    const voters = signers.slice(1, signers.length);
    let voterAddresses = [];

    for (let i = 0; i < voters.length; i++) {
      voterAddresses[i] = voters[i].getAddress();
    }

    const ballotFactory = await ethers.getContractFactory("Ballot");
    const ballot = await ballotFactory.deploy(
      proposalNames,
      startTime,
      endTime,
      voterAddresses,
      { value: depositAmount }
    );

    return { ballot, proposalNames, startTime, endTime, owner, voters };
  }

  describe("Deployment", () => {
    it("Should set the right owner", async function () {
      const { ballot, owner } = await loadFixture(deployBallotFixture);

      expect(await ballot.owner()).to.equal(await owner.getAddress());
      console.log("Owner: ", await owner.getAddress());
      console.log("Contract Address: ", ballot.address);

      let contractBalance = await ethers.provider.getBalance(ballot.address);
      console.log("Contract Balance: ", contractBalance.toString());
    });

    it("Should set the right proposal names", async function () {
      const { ballot, proposalNames } = await loadFixture(deployBallotFixture);

      let proposalNames_: string[] = await ballot.getProposalNames();
      for (let i = 0; i < proposalNames.length; i++) {
        expect(proposalNames_[i]).to.equal(proposalNames[i]);
      }
      console.log("Proposal Names: ", proposalNames_);
    });

    it("Should set the right start time and end time", async function () {
      const { ballot, startTime, endTime } = await loadFixture(
        deployBallotFixture
      );
      console.log("Periode: ", startTime, " - ", endTime);

      const periode: number[] = await ballot.getPeriode();
      expect(periode[0]).to.equal(startTime);
      expect(periode[1]).to.equal(endTime);
    });

    it("Should set the right voters weight", async function () {
      const { ballot, voters } = await loadFixture(deployBallotFixture);

      for (let i = 0; i < voters.length; i++) {
        let ballotContract = new ethers.Contract(
          ballot.address,
          jsonBallot.abi,
          voters[i]
        );
        const weight = await ballotContract.getWeight();
        expect(weight).to.equal(1);
        console.log("Voters: ", await voters[i].getAddress());
      }
    });
  });

  describe("Voting", () => {
    function sleep(s: number) {
      const timeInitial: number = Math.floor(Date.now() / 1000);
      var timeNow: number = Math.floor(Date.now() / 1000);
      for (; timeNow - timeInitial < s; ) {
        timeNow = Math.floor(Date.now() / 1000);
      }
      console.log("Sleep done!");
    }

    it("Should set the right vote", async function () {
      const { ballot, proposalNames, voters } = await loadFixture(
        deployBallotFixture
      );

      console.log("Casting votes");
      for (let i = 0; i < voters.length; i++) {
        let ballotContract = new ethers.Contract(
          ballot.address,
          jsonBallot.abi,
          voters[i]
        );

        if (i < voters.length - 1) {
          await ballotContract.vote(0, Math.floor(Date.now() / 1000));
        } else {
          await ballotContract.vote(1, Math.floor(Date.now() / 1000));
        }
      }
      console.log("Sleep over 4 seconds...");
      sleep(6);
      console.log("Sleep done!");

      let voteCounts: number[];
      voteCounts = await ballot.getVoteCounts(Math.floor(Date.now() / 1000), {
        gasLimit: 1 * 10 ** 6,
      });

      expect(voteCounts[0]).to.equal(voters.length - 1);
      expect(voteCounts[1]).to.equal(1);
      expect(voteCounts[2]).to.equal(0);
      console.log("Vote Counts: ", voteCounts.toString());
    });

    // it("Should fail to vote if end time has passed", async function () {
    //   const { ballot, proposalNames, voters } = await loadFixture(
    //     deployBallotFixture
    //   );
    //   let ballotContract = new ethers.Contract(
    //     ballot.address,
    //     jsonBallot.abi,
    //     voters[0]
    //   );
    //   expect(
    //     await ballotContract.vote(0, Math.floor(Date.now() / 1000), {
    //       gasLimit: 1 * 10 ** 6,
    //     })
    //   ).to.be.revertedWith("Voting has ended");
    // });

    it("Should set the right winner name", async function () {
      const { ballot, proposalNames } = await loadFixture(deployBallotFixture);
      var winnerName_;
      winnerName_ = await ballot.winnerName(Math.floor(Date.now() / 1000), {
        gasLimit: 1 * 10 ** 6,
      });
      expect(winnerName_).to.equal(proposalNames[0]);
      console.log("Winner name: ", winnerName_);
    });

    it("Should transfer ether to random succes voter", async function () {
      const { ballot, proposalNames } = await loadFixture(deployBallotFixture);
      var winnerName_;
      winnerName_ = await ballot.rewardRandomVoter(0, 8, {
        gasLimit: 1 * 10 ** 6,
      });
      // expect(winnerName_).to.equal(proposalNames[0]);
      console.log("Winner name: ", winnerName_);
    });
  });
});
