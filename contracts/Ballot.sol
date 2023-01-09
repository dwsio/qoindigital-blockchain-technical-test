// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Ballot is Ownable {
    uint256 startTime;
    uint256 endTime;
    uint256 totalVotes;
    uint256 totalVoters;
    bool rewarded;

    struct Voter {
        bool voted;
        uint256 vote;
    }

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        uint256 votePercentage;
    }

    Candidate[] public candidates;
    mapping(address => Voter) public voters;
    address[] public voterAddresses;
    Candidate[] public winningCandidates;
    address[] public winningVoters;

    event AnnounceWinner(string, uint256, uint256);

    constructor(
        string[] memory candidateNames,
        uint256 _startTime,
        uint256 _endTime,
        address[] memory _voterAddresses
    ) payable Ownable() {
        require(_startTime < _endTime, "The start time is overlaps end time");

        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(
                Candidate({
                    id: i,
                    name: candidateNames[i],
                    voteCount: 0,
                    votePercentage: 0
                })
            );
        }

        startTime = _startTime;
        endTime = _endTime;
        rewarded = false;

        for (uint256 j = 0; j < voterAddresses.length; j++) {
            addVoter(_voterAddresses[j]);
            voterAddresses.push(_voterAddresses[j]);
        }
    }

    function addVoter(address voterAddress) private {
        voters[voterAddress].voted = false;
        voters[voterAddress].vote = 0;
    }

    function getPeriode() public view returns (uint256, uint256) {
        return (startTime, endTime);
    }

    function getCandidates() public view returns (Candidate[] memory) {
        return candidates;
    }

    function getVoters() public view returns (address[] memory) {
        return voterAddresses;
    }

    /**
     * @param candidateId start from 0
     */
    function castVote(
        address voterAddress,
        uint256 candidateId,
        uint256 currentTime
    ) public {
        require(currentTime > startTime, "Voting hasn't started yet");
        require(currentTime < endTime, "Voting has ended");
        require(isExist(voterAddress), "Not an eligible voter");
        require(!voters[voterAddress].voted, "Already voted");
        require(candidates.length > candidateId, "Candidate doesn't exist");

        voters[voterAddress].voted = true;
        voters[voterAddress].vote = candidateId;

        totalVotes = totalVotes + 1;
        candidates[candidateId].voteCount += 1;
    }

    function isExist(address voterAddress) private view returns (bool) {
        for (uint256 i = 0; i < voterAddresses.length; i++) {
            if (voterAddresses[i] == voterAddress) {
                return true;
            }
        }
        return false;
    }

    // Block
    function voterTurnout() private view returns (uint256) {
        return ((totalVotes * 100) / voterAddresses.length);
    }

    function tallyResults(
        uint256 currentTime
    ) private returns (address[] memory, Candidate[] memory) {
        require(currentTime > endTime, "Voting hasn't ended yet");
        require(voterTurnout() >= 60, "Not Enough voters");

        winningCandidates.push(Candidate(0, "", 0, 0));

        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > winningCandidates[0].voteCount) {
                delete winningCandidates;
                winningCandidates.push(candidates[i]);
            } else if (
                candidates[i].voteCount == winningCandidates[0].voteCount
            ) {
                winningCandidates.push(candidates[i]);
            }

            candidates[i].votePercentage =
                (candidates[i].voteCount * 100) /
                totalVotes;
        }

        for (uint256 j = 0; j < voterAddresses.length; j++) {
            if (voters[voterAddresses[j]].vote == winningCandidates[0].id) {
                winningVoters.push(voterAddresses[j]);
            }
        }

        return (winningVoters, winningCandidates);
    }

    // Block
    function announceWinner(
        uint256 currentTime
    ) private view returns (string memory, uint256, uint256) {
        require(currentTime > endTime, "Voting hasn't ended yet");
        string memory message;

        if (winningCandidates.length > 1) {
            message = "It's a tie";
        } else {
            message = winningCandidates[0].name;
        }
        return (
            message,
            winningCandidates[0].voteCount,
            winningCandidates[0].votePercentage
        );
    }

    function sendData(uint256 currentTime) public {
        (
            string memory name,
            uint256 voteCount,
            uint256 votePercentage
        ) = announceWinner(currentTime);
        emit AnnounceWinner(name, voteCount, votePercentage);
    }

    function getWinningCandidate() public view returns (Candidate[] memory) {
        return winningCandidates;
    }

    // Block
    function rewardRandomVoter() public {
        require(!rewarded, "A voter already rewarded");

        address randomVoter = getRandomVoter();
        sendEther(payable(randomVoter));
        rewarded = true;
    }

    function getRandomVoter() public view returns (address) {
        uint256 r = createRandom(winningVoters.length);
        return winningVoters[r];
    }

    function createRandom(uint256 number) public view returns (uint256) {
        return uint256(blockhash(block.number - 1)) % number;
    }

    function sendEther(address payable _to) public payable {
        bool sent = _to.send(0.1 ether);
        require(sent, "Failed to send Ether");
    }
}
