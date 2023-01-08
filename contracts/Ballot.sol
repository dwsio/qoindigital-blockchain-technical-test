// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// import "hardhat/console.sol";

/**
 * @title Ballot
 * @dev Implements voting process along with vote delegation
 */
contract Ballot is Ownable, ReentrancyGuard {
    struct Voter {
        uint weight; // weight is accumulated by delegation
        bool voted; // if true, that person already voted
        address delegate; // person delegated to
        uint vote; // index of the voted proposal
        bool rewarded;
    }

    struct Proposal {
        string name; // short name (up to 32 bytes)
        uint voteCount; // number of accumulated votes
    }

    mapping(address => Voter) public voters;

    address[] public voterAddresses;
    Proposal[] public proposals;

    uint startTime;
    uint endTime;

    /**
     * @dev Create a new ballot to choose one of 'proposalNames' and set the time.
     * @param proposalNames names of proposals
     * @param startTime_ start time of voting process
     * @param endTime_ end time of voting process
     */
    constructor(
        string[] memory proposalNames,
        uint startTime_,
        uint endTime_,
        address[] memory voters_
    ) payable Ownable() {
        require(startTime_ < endTime_, "The start time is overlaps end time");

        for (uint i = 0; i < proposalNames.length; i++) {
            // 'Proposal({...})' creates a temporary
            // Proposal object and 'proposals.push(...)'
            // appends it to the end of 'proposals'.
            proposals.push(Proposal({name: proposalNames[i], voteCount: 0}));
        }

        startTime = startTime_;
        endTime = endTime_;

        giveRightToVote(voters_);
    }

    /**
     * @dev Give 'voter' the right to vote on this ballot. May only be called by 'chairperson'.
     * @param voters_ address list of voter
     */
    function giveRightToVote(address[] memory voters_) public onlyOwner {
        for (uint i = 0; i < voters_.length; i++) {
            require(!voters[voters_[i]].voted, "The voter already voted");
            require(voters[voters_[i]].weight == 0);
            voters[voters_[i]].weight = 1;
            voters[voters_[i]].rewarded = false;
            voterAddresses.push(voters_[i]);
        }
    }

    /**
     * @dev Delegate your vote to the voter 'to'.
     * @param to address to which vote is delegated
     */
    function delegate(address to) public {
        Voter storage sender = voters[msg.sender];
        require(!sender.voted, "You already voted");
        require(to != msg.sender, "Self-delegation is disallowed");

        while (voters[to].delegate != address(0)) {
            to = voters[to].delegate;

            // We found a loop in the delegation, not allowed.
            require(to != msg.sender, "Found loop in delegation");
        }
        sender.voted = true;
        sender.delegate = to;
        Voter storage delegate_ = voters[to];
        if (delegate_.voted) {
            // If the delegate already voted,
            // directly add to the number of votes
            proposals[delegate_.vote].voteCount += sender.weight;
        } else {
            // If the delegate did not vote yet,
            // add to her weight.
            delegate_.weight += sender.weight;
        }
    }

    /**
     * @dev Get voting periode.
     * @return startTime_ start time of voting process
     * @return endTime_ end time of voting process
     */
    function getPeriode() public view returns (uint, uint) {
        return (startTime, endTime);
    }

    /**
     * @dev Get voting periode.
     * @return voterWeight wight of current voter
     */
    function getWeight() public view returns (uint) {
        return voters[msg.sender].weight;
    }

    /**
     * @dev Get proposal names.
     * @return proposalNames the list of proposal name
     */
    function getProposalNames() public view returns (string[] memory) {
        string[] memory proposalNames = new string[](proposals.length);
        for (uint i = 0; i < proposals.length; i++) {
            // 'string[] memory proposalNames = ...' creates a temporary
            // array with allocated memory and 'proposalNames[i] = ...'
            // copy every element of 'proposals.name' to it.
            proposalNames[i] = proposals[i].name;
        }
        return proposalNames;
    }

    /**
     * @dev Get proposal vote counts
     * @param currentTime current time in seconds
     * @return voteCounts the list of proposal vote counts
     */
    function getVoteCounts(
        uint currentTime
    ) public view returns (uint[] memory) {
        require(currentTime > endTime, "Voting hasn't ended yet");

        uint[] memory voteCounts = new uint[](proposals.length);
        for (uint i = 0; i < proposals.length; i++) {
            // 'uint[] memory proposalVoteCounts = ...' creates a temporary
            // array with allocated memory and 'proposalVoteCounts[i] = ...'
            // copy every element of 'proposals.voteCount' to it.
            voteCounts[i] = proposals[i].voteCount;
        }
        return voteCounts;
    }

    /**
     * @dev Give your vote (including votes delegated to you) to proposal 'proposals[proposal].name'
     * @param proposal index of proposal in the proposals array
     * @param currentTime current time in seconds
     */
    function vote(uint proposal, uint currentTime) public nonReentrant {
        Voter storage sender = voters[msg.sender];

        require(currentTime > startTime, "Voting hasn't started yet");
        require(currentTime < endTime, "Voting has ended");
        require(sender.weight != 0, "You have no right to vote");
        require(!sender.voted, "You already voted");

        sender.voted = true;
        sender.vote = proposal;

        // If 'proposal' is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        proposals[proposal].voteCount += sender.weight;
    }

    /**
     * @dev Computes the winning proposal taking all previous votes into account.
     * @return winningProposal_ index of winning proposal in the proposals array
     */
    function winningProposal() internal view returns (uint winningProposal_) {
        uint winningVoteCount_ = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount_) {
                winningVoteCount_ = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    /**
     * @dev Calls winningProposal() function to get the index of the winner contained in the proposals array and then
     * @param currentTime current time in seconds
     * @return winnerName_ the name of the winner
     */
    function winnerName(
        uint currentTime
    ) public view returns (string memory winnerName_) {
        require(currentTime > endTime, "Voting hasn't ended yet");

        uint winningProposal_ = winningProposal();
        winnerName_ = proposals[winningProposal_].name;
    }

    function createRandom(uint number) public view returns (uint) {
        return uint(blockhash(block.number - 1)) % number;
    }

    function rewardRandomVoter(
        uint winningProposal_,
        uint winningVoteCount_
    ) public {
        address[] memory successVoters = new address[](winningVoteCount_ + 1);
        uint j = 0;
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].vote == winningProposal_) {
                successVoters[j] = voterAddresses[i];

                j++;
            }
        }

        uint random = createRandom(successVoters.length);

        require(
            voters[successVoters[random]].rewarded == false,
            "Voter already rewarded"
        );
        sendEther(payable(successVoters[random]));
        voters[successVoters[random]].rewarded == true;
    }

    function sendEther(address payable _to) public payable nonReentrant {
        // Send returns a boolean value indicating success or failure.
        // This function is not recommended for sending Ether.
        bool sent = _to.send(0.1 ether);
        require(sent, "Failed to send Ether");
    }
}
