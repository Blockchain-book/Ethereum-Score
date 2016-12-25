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

//客户实现任意的积分转让
function transferScoreToAnotherFromCustomer() {
    var receivedAddr = document.getElementById("anotherAddress").value;
    var amount = parseInt(document.getElementById("scoreAmount").value);
    contractAddr.transferScoreToAnother(0, currentAccount, receivedAddr, amount, {from: account});
    var eventTransferScoreToAnother = contractAddr.TransferScoreToAnother();
    eventTransferScoreToAnother.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        eventTransferScoreToAnother.stopWatching();
    });
}

//客户购买商品
function buyGood() {
    var goodId = document.getElementById("goodId").value;
    contractAddr.buyGood(currentAccount, goodId, {from: account});
    var eventBuyGood = contractAddr.BuyGood();
    eventBuyGood.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        if(event.args.isSuccess){
            contractAddr.buyGoodSuccess(currentAccount, goodId, {from: account});
        }

        eventBuyGood.stopWatching();
    });
}

//查看已经购买的商品
function getGoodsByCustomer() {
    contractAddr.getGoodsByCustomer.call(currentAccount, {from: account}).then(function (result) {
        console.log(result.length);
        console.log(result);

        for (var i = 0; i < result.length; i++){
            var temp = hexCharCodeToStr(result[i]);
            console.log(temp);
        }
    });
}

