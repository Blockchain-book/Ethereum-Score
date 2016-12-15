var accounts;
var account;

//更新状态
function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

//发行积分给客户
function sendScoreToCustomer() {
  var contractAddr = Score.deployed();

  var amount = parseInt(document.getElementById("amount").value); //转化为int值
  var receiver = document.getElementById("receiver").value;

  setStatus("交易确认中，请稍候...");

  contractAddr.sendScoreToCustomer(receiver, amount, {from: account}).then(function() {
    setStatus("发行积分完成！");
  }).catch(function(e) {
    console.log(e);
    setStatus("发行积分失败！");
  });
};

//根据客户address获取积分余额
function getScoreWithCustomerAddr() {
  var contractAddr = Score.deployed();
  var customerAddr = document.getElementById("customerAddr").value;
  contractAddr.getScoreWithCustomerAddr.call(customerAddr, {from: account}).then(function(value) {
    var balance_element = document.getElementById("score");
    balance_element.innerHTML = value.valueOf();
    setStatus("查询积分完成！");
  }).catch(function(e) {
    console.log(e);
    setStatus("查询积分失败！");
  });

}

//客户赠送积分给另外一个客户
function transferScoreToOtherCustomer() {
  var contractAddr = Score.deployed();
  var senderAddr = document.getElementById("customerSenderAddr").value;
  var receivedAddr = document.getElementById("customerReceivedAddr").value;
  var amount = parseInt(document.getElementById("customerTransferAmount").value);
  contractAddr.transferScoreToOtherCustomer(senderAddr, receivedAddr, amount, {from: account}).then(function() {
    setStatus("赠送积分完成！");
  }).catch(function(e) {
    console.log(e);
    setStatus("赠送积分失败！");
  });
}

//商户赠送积分给另外一个商户
function transferScoreToOtherMerchant() {
  var contractAddr = Score.deployed();
  var senderAddr = document.getElementById("merchantSenderAddr").value;
  var receivedAddr = document.getElementById("merchantSenderAddr").value;
  var amount = parseInt(document.getElementById("merchantTransferAmount").value);
  contractAddr.transferScoreToOtherMerchant(senderAddr, receivedAddr, amount, {from: account}).then(function() {
    setStatus("赠送积分完成！");
  }).catch(function(e) {
    console.log(e);
    setStatus("赠送积分失败！");
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
  });
}



