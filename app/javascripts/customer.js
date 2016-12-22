var currentAccount; //当前客户的账户地址

//根据客户address获取积分余额
function getScoreWithCustomerAddr() {
  console.log(currentAccount);
  contractAddr.getScoreWithCustomerAddr.call(currentAccount, {from: account}).then(function(value) {
    alert("当前余额：" + value.valueOf());
  }).catch(function(e) {
    console.log(e);
    alert("出现异常，查询余额失败！");
  });
}

function getCurrentCustomer() {
    alert(currentAccount);
}

//客户赠送积分给另外一个客户
function transferScoreToOtherCustomer() {
    var receivedAddr = document.getElementById("anotherCustomerAddr").value;
    var amount = parseInt(document.getElementById("scoreAmount").value);
    contractAddr.transferScoreToOtherCustomer(currentAccount, receivedAddr, amount, {from: account});
    var eventTransferScoreToOtherCustomer = contractAddr.TransferScoreToOtherCustomer();
    eventTransferScoreToOtherCustomer.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        eventTransferScoreToOtherCustomer.stopWatching();
    });

}

