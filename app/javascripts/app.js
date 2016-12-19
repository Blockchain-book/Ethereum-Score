//全局变量
var accounts; //以太坊客户端的账户数组
var account;
var contractAddr; //合约地址

//更新状态
function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
}

//注册一个客户
function newCustomer() {
  var address = document.getElementById("customerAddress").value;
  var password = document.getElementById("customerPassword").value;

  contractAddr.newCustomer(address, password, {from: account});

  var eventAddr = contractAddr.NewCustomer();
  eventAddr.watch(function(error, event) {
    console.log(event.args.message);
    alert(event.args.message);
    
    if(event.args.isSuccess) {
      contractAddr.setCustomerPassword(address, password, {from: account});
    }
    eventAddr.stopWatching(); //一定要停止监听，否则有bug；  
  });

  var eventAddr2 = contractAddr.SetCustomerPassword();
  eventAddr2.watch(function(error, event) {
     console.log(event.args.message);
    //alert(event.args.message);
    eventAddr2.stopWatching();
  });
}

//注册一个商户
function newMerchant() {
  var register = document.getElementById("merchantRegister").value;

  contractAddr.newMerchant(register, {from: account}).then(function() {
    setStatus("注册商户完成！");
  }).catch(function(e) {
    console.log(e);
    setStatus("注册商户失败！");
  });
}

//十六进制转化为字符串
function hexCharCodeToStr(hexCharCodeStr) {
　　var trimedStr = hexCharCodeStr.trim();
　　var rawStr = 
　　trimedStr.substr(0,2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
　　var len = rawStr.length;
　　if(len % 2 !== 0) {
　　　　alert("Illegal Format ASCII Code!");
　　　　return "";
　　}
　　var curCharCode;
　　var resultStr = [];
　　for(var i = 0; i < len;i = i + 2) {
　　　　curCharCode = parseInt(rawStr.substr(i, 2), 16); // ASCII Code Value
　　　　resultStr.push(String.fromCharCode(curCharCode));
　　}
　　return resultStr.join("");
}


//发行积分给客户
function sendScoreToCustomer() {

  var amount = parseInt(document.getElementById("amount").value); //转化为int值
  var receiver = document.getElementById("receiver").value;

  setStatus("交易确认中，请稍候...");


  var exampleEvent = contractAddr.ReturnValue({_from: web3.eth.coinbase});
  exampleEvent.watch(function(err, result) {
    if(err) {
      setStatus(err);
      return;
    }
    setStatus(result.args._value);

  });

  contractAddr.sendScoreToCustomer.sendTransaction(web3.eth.coinbase,10,{from:  web3.eth.coinbase});

  contractAddr.sendScoreToCustomer(web3.eth.coinbase, 10, {from: account}).then(function() {
    
    //setStatus("发行积分成功！");
    
  }).catch(function(e) {
    //setStatus("发行积分失败！");
  });


}

//根据客户address获取积分余额
function getScoreWithCustomerAddr() {
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

//商户和银行进行积分清算
function settleScoreWithBank() {
  var settleAddr = document.getElementById("settleAddr").value;
  var settleAmount = parseInt(document.getElementById("settleAmount").value);
  contractAddr.settleScoreWithBank(settleAmount, settleAmount, {from: account}).then(function() {
    setStatus("清算积分完成！");

  }).catch(function(e) {
    console.log(e);
    setStatus("清算积分失败");
  });
}

window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err !== null) {
      //如果没有开启以太坊客户端（testrpc、geth私有链），则无法获取账号
      alert("无法连接到以太坊客户端...");
      return;
    }

    if (accs.length === 0) {
      //没有以太坊账号
      alert("获得账号为空");
      return;
    }

    accounts = accs;
    account = accounts[0]; //以第一个默认账号作为调用合约的账号
    contractAddr = Score.deployed(); //获得合约地址
  });
};



