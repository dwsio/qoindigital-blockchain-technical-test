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
  const contractAddrVal = document.getElementById("contractAddrVal");
  const accountAddrVal = document.getElementById("accountAddrVal");
  const connectBtn = document.getElementById("connectBtn");
  const questionStr = document.getElementById("questionStr");
  const voteVal = document.getElementById("voteBox");
  const submitBtn = document.getElementById("submitBtn");
  const computeBtn = document.getElementById("computeBtn");

  var accountBtnsInitialized = false;

  // check is web3 connected
  const isWeb3Connected = () => {
    const web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:7545")
    );
    return Boolean(web3);
  };

  const accounts = await web3.eth.getAccounts();
  const voterAccs = accounts.slice(1, accounts.length - 1);
  const chainId = await web3.eth.getChainId();
  handleNewChain(chainId);

  var evoteContract;
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
    } else if (distance < 0) {
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

  // update buttons on first load
  const updateButtons = () => {
    if (!isWeb3Connected()) {
      handleStatus(1, "Web3 not connected");
    } else {
      phaseDivs[0].hidden = false;
    }
  };

  const initializeaccountBtns = async () => {
    if (accountBtnsInitialized) {
      return;
    }
    accountBtnsInitialized = true;

    connectBtn.onclick = async () => {
      try {
        const myAccount = accountAddrVal.value;
        var accountIndex = -1;

        //check is voter account
        for (let i = 0; i < voterAccs.length; i++) {
          if (voterAccs[i] == myAccount) {
            accountIndex = i;
            handleNewAccount(myAccount);

            const myBalance = await web3.eth.getBalance(myAccount);
            handleNewBalance(myBalance);
            break;
          }
        }
        if (accountIndex < 0) {
          handleStatus(1, "Invalid account address");
          return;
        }

        // create contract instance
        const evoteContract = new web3.eth.Contract(
          BallotABI.abi,
          contractAddrVal.value,
          { from: myAccount, gas: 3000000, gasPrice: "20" }
        );
        if (evoteContract.options.address === undefined)
          throw "Connection failed";

        endPhases = await evoteContract.methods.getPhases().call();

        handleStatus(0, "Contract connected");
        setActivePhase(1);
        phaseDivs[0].hidden = true;
        phaseDivs[1].hidden = false;

        // register new voter to the contract instance

        questionStr.value = await evoteContract.methods.getCandidates().call();

        handleStatus(0, "A voter registered");

        // submit vote to the contract instance
        let candidateId = 0;
        submitBtn.onclick = async () => {
          candidateId = voteVal.value;

          const tx = await evoteContract.methods
            .castVote(myAccount, candidateId, Date.now())
            .send({ from: myAccount, gas: 3000000, gasPrice: "20" });
          console.log(tx);

          handleStatus(0, "A vote submitted");

          computeBtn.onclick = async () => {
            const voteCounts = await evoteContract.methods
              .getVoteCounts()
              .call();
            const candidateNames = await evoteContract.methods
              .getCandidates()
              .call();

            // create chart of voting result
            new Chart("resultChart", {
              type: "doughnut",
              data: {
                labels: candidateNames,
                datasets: [
                  {
                    data: voteCounts,
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
