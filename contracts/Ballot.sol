// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Ballot {
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
    uint256[] public voteCounts;
    uint256[] public endPhases;
    string[] public names;

    event AnnounceWinner(string, uint256, uint256);

    constructor(
        string[] memory candidateNames,
        uint256[] memory _endPhases,
        address[] memory _voterAddresses
    ) payable {
        for (uint256 i = 0; i < candidateNames.length; i++) {
            candidates.push(
                Candidate({
                    id: i,
                    name: candidateNames[i],
                    voteCount: 0,
                    votePercentage: 0
                })
            );

            names.push(candidateNames[i]);
        }
        for (uint256 j = 0; j < _endPhases.length; j++) {
            endPhases.push(_endPhases[j]);
        }
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

    function getPhases() public view returns (uint256[] memory) {
        return endPhases;
    }

    function getCandidates() public view returns (string[] memory) {
        return names;
    }

    function getVoters() public view returns (address[] memory) {
        return voterAddresses;
    }

    function getVoterCount() public view returns (uint256) {
        return totalVoters;
    }

    function getVoteCount() public view returns (uint256) {
        return totalVotes;
    }

    function getVoteCounts() public returns (uint256[] memory) {
        for (uint256 i = 0; i < candidates.length; i++) {
            voteCounts.push(candidates[i].voteCount);
        }
        return voteCounts;
    }

    /**
     * @param candidateId start from 0
     */
    function castVote(
        address voter,
        uint256 candidateId,
        uint256 currentTime
    ) public {
        require(currentTime > endPhases[1], "Voting hasn't started yet");
        require(currentTime < endPhases[2], "Voting has ended");
        // require(isExist(voter), "Not an eligible voter");
        // require(!voters[voter].voted, "Already voted");
        require(candidates.length > candidateId, "Candidate doesn't exist");

        voters[voter].voted = true;
        voters[voter].vote = candidateId;

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
        require(currentTime > endPhases[2], "Voting hasn't ended yet");
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
        require(currentTime > endPhases[1], "Voting hasn't ended yet");
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
        bool sent = _to.send(0.0001 ether);
        require(sent, "Failed to send Ether");
    }
}
