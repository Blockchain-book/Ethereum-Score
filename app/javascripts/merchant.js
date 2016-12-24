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

//客户实现任意的积分转让
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

