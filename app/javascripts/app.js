var accounts;
var account;

function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

function refreshBalance() {
  var meta = Score.deployed();

  meta.getBalance.call(account, {from: account}).then(function(value) {
    var balance_element = document.getElementById("balance");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });
};

function sendScore() {
  var meta = Score.deployed();

  var amount = parseInt(document.getElementById("amount").value);
  var receiver = document.getElementById("receiver").value;

  setStatus("Initiating transaction... (please wait)");

  meta.sendScore(receiver, amount, {from: account}).then(function() {
    setStatus("Transaction complete!");
    refreshBalance();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error sending score; see log.");
  });
};

function getScore() {
  var meta = Score.deployed();
  var finder = document.getElementById("findAccount").value;
  meta.getBalance.call(finder, {from: account}).then(function(value) {
    var balance_element2 = document.getElementById("balance2");
    balance_element2.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });

}

window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];

    refreshBalance();
  });
}
