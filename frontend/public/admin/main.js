import Web3 from "web3";
import BallotABI from "./Ballot.json";

const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));

const initialize = async () => {
  const phases = [
    document.getElementById("phase1"),
    document.getElementById("phase2"),
    document.getElementById("phase3"),
    document.getElementById("phase4"),
  ];
  const phaseDivs = [
    document.getElementById("setupDiv"),
    document.getElementById("registerDiv"),
    document.getElementById("castDiv"),
    document.getElementById("tallyDiv"),
  ];
  const accountVal = document.getElementById("accountVal");
  const balanceVal = document.getElementById("balanceVal");
  const chainIdVal = document.getElementById("chainIdVal");
  const questionStr = document.getElementById("questionStr");
  const votersVal = document.getElementById("votersVal");
  const voterRegInt = document.getElementById("voterRegInt");
  const voteCastInt = document.getElementById("voteCastInt");
  const tallyCompInt = document.getElementById("tallyCompInt");
  const disputeInt = document.getElementById("disputeInt");
  const deployBtn = document.getElementById("deployBtn");
  const contractAddr = document.getElementById("contractAddr");
  const copyBtn = document.getElementById("copyBtn");
  const computeBtn = document.getElementById("computeBtn");
  const phase1Text = document.getElementById("phase1Text");
  const phase2Text = document.getElementById("phase2Text");

  var accountBtnsInitialized = false;
  const accountBtns = [deployBtn, computeBtn];

  // check is web3 connected
  const isWeb3Connected = () => {
    const web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:7545")
    );
    return Boolean(web3);
  };

  const accounts = await web3.eth.getAccounts();
  const myAccount = accounts[0];
  handleNewAccount(myAccount);

  const voterAccs = accounts.slice(1, accounts.length - 1);

  const myBalance = await web3.eth.getBalance(myAccount);
  handleNewBalance(myBalance);

  const chainId = await web3.eth.getChainId();
  handleNewChain(chainId);

  var evoteContract;
  var voteCount;
  var voterCount;
  var endTime;
  var activePhase;
  var endPhases = [];
  endPhases.push(Date.now());
  setActivePhase(0);
  var cd = setInterval(async function () {
    endTime = endPhases[activePhase];
    var now = Date.now();
    var distance = endTime - now;
    var timeVal =
      Math.floor(distance / (1000 * 60 * 60)) +
      ":" +
      Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)) +
      ":" +
      Math.floor((distance % (1000 * 60)) / 1000);

    phases[activePhase].value = timeVal;
    if (activePhase == 0) {
      phases[activePhase].value = "-:-:-";
    } else if (distance > 0) {
      if (activePhase == 1) {
        evoteContract = new web3.eth.Contract(
          BallotABI.abi,
          contractAddr.value,
          {
            from: myAccount,
            gas: 3000000,
            gasPrice: "20",
          }
        );
        voterCount = await evoteContract.methods.getVoterCount().call();
        phase1Text.innerHTML =
          "Share the contract address below with voters. There is currently " +
          voterCount +
          "/8 registered voters.";
      } else if (activePhase == 2) {
        evoteContract = new web3.eth.Contract(
          BallotABI.abi,
          contractAddr.value,
          {
            from: myAccount,
            gas: 3000000,
            gasPrice: "20",
          }
        );
        voteCount = await evoteContract.methods.getVoteCount().call();
        phase2Text.innerHTML =
          "There is currently " +
          voteCount +
          "/" +
          voterCount +
          " submitted votes.";
      }
    } else {
      phases[activePhase].value = "-:-:-";
      phaseDivs[activePhase].hidden = true;
      activePhase = activePhase + 1;
      if (activePhase == 4) {
        clearInterval(cd);
      } else {
        phaseDivs[activePhase].hidden = false;
        setActivePhase(activePhase);
      }
    }
  }, 1000);

  const updateButtons = () => {
    if (!isWeb3Connected()) {
      for (const button of accountBtns) {
        button.disabled = true;
      }
      handleStatus(1, "Web3 not connected");
    } else {
      deployBtn.disabled = false;
      phaseDivs[0].hidden = false;
    }
  };

  const initializeaccountBtns = async () => {
    if (accountBtnsInitialized) {
      return;
    }
    accountBtnsInitialized = true;

    votersVal.value = voterAccs.toString();

    deployBtn.onclick = async () => {
      handleStatus(0, "Deploying contract...");

      try {
        // check voter accounts
        var candidateNames = questionStr.value.split(",");
        var eligibleVtrAccs = votersVal.value.split(",");

        var tmpArr = voterRegInt.value.split(/(?:-|T|:)+/);
        var tmpTime = new Date(
          tmpArr[0],
          tmpArr[1] - 1,
          tmpArr[2],
          tmpArr[3],
          tmpArr[4]
        ).getTime();
        endPhases.push(tmpTime);

        tmpArr = voteCastInt.value.split(/(?:-|T|:)+/);
        tmpTime = new Date(
          tmpArr[0],
          tmpArr[1] - 1,
          tmpArr[2],
          tmpArr[3],
          tmpArr[4]
        ).getTime();
        endPhases.push(tmpTime);

        tmpArr = tallyCompInt.value.split(/(?:-|T|:)+/);
        tmpTime = new Date(
          tmpArr[0],
          tmpArr[1] - 1,
          tmpArr[2],
          tmpArr[3],
          tmpArr[4]
        ).getTime();
        endPhases.push(tmpTime);

        tmpArr = disputeInt.value.split(/(?:-|T|:)+/);
        tmpTime = new Date(
          tmpArr[0],
          tmpArr[1] - 1,
          tmpArr[2],
          tmpArr[3],
          tmpArr[4]
        ).getTime();
        endPhases.push(tmpTime);

        // deploy smart contract
        const EvoteFactory = new web3.eth.Contract(BallotABI.abi);
        var contractAddress;
        const tx = await EvoteFactory.deploy({
          data: BallotABI.bytecode,
          arguments: [candidateNames, endPhases, eligibleVtrAccs],
        })
          .send({
            from: myAccount,
            value: web3.utils.toWei("1", "ether"),
            gas: 3000000,
            gasPrice: "20",
          })
          .on("receipt", function (receipt) {
            contractAddr.value = receipt.contractAddress;
          });

        if (EvoteFactory.options.address === undefined)
          throw "Deployment failed";

        evoteContract = new web3.eth.Contract(
          BallotABI.abi,
          contractAddr.value,
          {
            from: myAccount,
            gas: 3000000,
            gasPrice: "20",
          }
        );

        handleStatus(0, "Contract deployed");
        setActivePhase(1);
        phaseDivs[0].hidden = true;
        phaseDivs[1].hidden = false;
        computeBtn.disabled = false;

        // copy the contract address value
        copyBtn.onclick = () => {
          contractAddr.select();
          navigator.clipboard.writeText(contractAddr.value);
          handleStatus(0, "Address copied");
        };

        // handleStatus(0, "Registration phase ended");

        // handleStatus(0, "Vote casting phase ended");

        //compute the tally
        computeBtn.onclick = async () => {
          console.log(tx);
          const voteCounts = await evoteContract.methods
            .getVoteCounts(Date.now())
            .send({
              from: accounts[0],
              gas: 3000000,
              gasPrice: "20000000",
            });
          // create chart of voting result
          new Chart("resultChart", {
            type: "doughnut",
            data: {
              labels: candidateNames,
              datasets: [
                {
                  data: [voteCounts],
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  position: "top",
                },
                title: {
                  display: true,
                  text: "Voting Result on " + getToday(),
                },
              },
            },
          });
        };
      } catch (e) {
        console.error(e);
        handleStatus(1, "Deployment failed");
      }
    };
  };

  function getToday() {
    const date = new Date();
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return (
      months[date.getMonth()] + " " + date.getDate() + " " + date.getFullYear()
    );
  }

  function setActivePhase(p) {
    for (let i = 0; i <= p; i++) {
      phases[i].className = "col col-sm-3 btn btn-primary";
      phases[i].disabled = true;
    }
    phases[p].disabled = false;
    activePhase = p;
  }

  function handleStatus(danger, text) {
    const alertPanel = document.getElementById("alertPanel");
    const contractStatus = document.getElementById("contractStatus");
    if (danger) {
      alertPanel.className = "alert alert-danger";
    } else {
      alertPanel.className = "alert alert-info";
    }
    contractStatus.innerHTML = text;
  }

  function handleNewAccount(account) {
    accountVal.innerHTML = account;
  }

  function handleNewChain(chainId) {
    chainIdVal.innerHTML = chainId;
  }

  function handleNewBalance(balance) {
    balanceVal.innerHTML = balance;
  }

  updateButtons();
  if (isWeb3Connected()) {
    initializeaccountBtns();
  }
};
window.addEventListener("DOMContentLoaded", initialize);
