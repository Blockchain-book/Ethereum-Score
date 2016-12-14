var accounts;
var account;

//更新状态
function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

//更新余额
function refreshBalance() {
  var contractAddr = Score.deployed();

  contractAddr.getBalance.call(account, {from: account}).then(function(value) {
    var balance_element = document.getElementById("balance");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("获取积分失败");
  });
};

function sendScore() {
  var contractAddr = Score.deployed();

  var amount = parseInt(document.getElementById("amount").value); //转化为int值
  var receiver = document.getElementById("receiver").value;

  setStatus("初始化交易，请等待...");

  contractAddr.sendScore(receiver, amount, {from: account}).then(function() {
    setStatus("交易完成！");
    refreshBalance();
  }).catch(function(e) {
    console.log(e);
    setStatus("发送积分失败");
  });
};

function getScore() {
  var contractAddr = Score.deployed();
  var finder = document.getElementById("findAccount").value;
  contractAddr.getBalance.call(finder, {from: account}).then(function(value) {
    var balance_element = document.getElementById("balance2");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("获取积分失败");
  });

}

window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      //如果没有开启以太坊客户端（testrpc、geth私有链），则无法获取账号
      alert("无法连接到以太坊客户端...");
      return;
    }

    if (accs.length == 0) {
      //没有以太坊账号
      alert("获得账号为空");
      return;
    }

    accounts = accs;
    account = accounts[0]; //以第一个默认账号作为调用合约的账号

    refreshBalance();
  });
}
