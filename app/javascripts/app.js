//全局变量
var accounts; //以太坊客户端的账户数组
var account;
var contractAddr; //合约地址

var currentAccount; //当前客户的账户地址

//更新状态
function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
}

//注册一个客户：out of gas的解决
function newCustomer() {
  var address = document.getElementById("customerAddress").value;
  var password = document.getElementById("customerPassword").value;

  contractAddr.newCustomer(address, {from: account});

  var eventNewCustomer = contractAddr.NewCustomer();
  eventNewCustomer.watch(function(error, event) {
    console.log(event.args.message);
    alert(event.args.message);
    
    if(event.args.isSuccess) {
      //注册成功，设置密码在两个方法中实现，因为在一个方法中实现会出现out of gas
      contractAddr.setCustomerPassword(address, password, {from: account});

      var eventSetCustomerPassword = contractAddr.SetCustomerPassword();
      eventSetCustomerPassword.watch(function(error, event) {
      console.log(event.args.message);
      
      eventSetCustomerPassword.stopWatching();
     });
    }
    eventNewCustomer.stopWatching(); //一定要停止监听，否则有bug；  
  });
}

//注册一个商户：out of gas的解决
function newMerchant() {
    var address = document.getElementById("merchantAddress").value;
    var password = document.getElementById("merchantPassword").value;

    contractAddr.newMerchant(address, {from: account});

    var eventNewMerchant = contractAddr.NewMerchant();
    eventNewMerchant.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        if(event.args.isSuccess) {
            contractAddr.setMerchantPassword(address, password, {from: account});

            var eventSetMerchantPassword = contractAddr.SetMerchantPassword();
            eventSetMerchantPassword.watch(function (error, event) {
                console.log(event.args.message);
                eventSetMerchantPassword.stopWatching();
            });
        }
        eventNewMerchant.stopWatching();
    });
}

//客户登录
function customerLogin() {
  var address = document.getElementById("customerLoginAddr").value;
  var password = document.getElementById("customerLoginPwd").value;

    contractAddr.getCustomerPassword(address, {from: account}).then(function(result) {
    console.log(password);
    console.log(hexCharCodeToStr(result[1]));

    if(result[0]){
        //查询密码成功
        if(password.localeCompare(hexCharCodeToStr(result[1])) === 0) {
            console.log("登录成功");
            //跳转到用户界面
            location.href="customer.html?account=" + address;
        }
        else {
            console.log("密码错误，登录失败");
            alert("密码错误，登录失败");
        }
    }
    else{
        //查询密码失败
        console.log("该用户不存在，请确定账号后再登录！");
        alert("该用户不存在，请确定账号后再登录！");
    }
  });
}

//商户登录
function merchantLogin() {
    var address = document.getElementById("merchantLoginAddr").value;
    var password = document.getElementById("merchantLoginPwd").value;
    contractAddr.getMerchantPassword(address, {from: account}).then(function (result) {
        console.log(password);
        console.log(hexCharCodeToStr(result[1]));

        if(result[0]){
            //查询密码成功
            if(password.localeCompare(hexCharCodeToStr(result[1])) == 0) {
                console.log("登录成功");
                //跳转到商户界面
                location.href="merchant.html?account=" + address;
            }
            else {
                console.log("密码错误,登录失败");
                alert("密码错误，登录失败");
            }
        }
        else{
            //查询密码失败
            console.log("该商户不存在，请确定账号后再登录！");
            alert("该商户不存在，请确定账号后再登录！");
        }
    });
}

//银行管理员登录
function bankLogin() {
    var address = document.getElementById("bankLoginAddr").value;
    contractAddr.getOwner({from: account}).then(function (result) {
        if(address.localeCompare(result) === 0) {
            //跳转到管理员页面
            location.href = "bank.html?account=" + address;
        }
        else {
            alert("不是银行账户，登录失败");
        }
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
    console.log("合约地址："+contractAddr.address);
  });
};



