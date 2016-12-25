//根据商户address获取积分余额
function getScoreWithMerchantAddr() {
    console.log(currentAccount);
    contractAddr.getScoreWithMerchantAddr.call(currentAccount, {from: account}).then(function(value) {
        alert("当前余额：" + value.valueOf());
    }).catch(function(e) {
        console.log(e);
        alert("出现异常，查询余额失败！");
    });
}

function getCurrentMerchant() {
    alert(currentAccount);
}

//商户实现任意的积分转让
function transferScoreToAnotherFromMerchant() {
    var receivedAddr = document.getElementById("anotherAccountAddr").value;
    var amount = parseInt(document.getElementById("scoreAmount").value);
    contractAddr.transferScoreToAnother(1, currentAccount, receivedAddr, amount, {from: account});
    var eventTransferScoreToAnother = contractAddr.TransferScoreToAnother();
    eventTransferScoreToAnother.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        eventTransferScoreToAnother.stopWatching();
    });
}

//商户增加一件商品：out of gas的解决
function addGood() {
    var goodId = document.getElementById("goodId").value;
    var goodPrice = parseInt(document.getElementById("goodPrice").value);
    contractAddr.addGood(currentAccount, goodId, goodPrice, {from: account});
    var eventAddGood = contractAddr.AddGood();
    eventAddGood.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        if(event.args.isSuccess){
            //把商品加入到数组中
            contractAddr.putGoodToArray(goodId, {from: account});
            var eventPutGoodToArray = contractAddr.PutGoodToArray();
            eventPutGoodToArray.watch(function (error, event) {
                console.log(event.args.message);

                contractAddr.putGoodToMerchant(currentAccount, goodId, {from:account});
                var eventPutGoodToMerchant = contractAddr.PutGoodToMerchant();
                eventPutGoodToMerchant.watch(function (error, event) {
                    console.log(event.args.message);
                    eventPutGoodToMerchant.stopWatching();
                });
                eventPutGoodToArray.stopWatching();
            });
        }
        eventAddGood.stopWatching();
    });
}

//商户查看已添加的所有商品
function getGoodsByMerchant() {
    contractAddr.getGoodsByMerchant.call(currentAccount, {from: account}).then(function (result) {
        console.log(result.length);
        console.log(result);

        for (var i = 0; i < result.length; i++){
            var temp = hexCharCodeToStr(result[i]).toString();
            console.log(temp);
        }
    });
}