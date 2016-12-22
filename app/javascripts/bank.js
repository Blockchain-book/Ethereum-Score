/**
 * Created by chenyufeng on 12/22/16.
 */

function sendScoreToCustomer() {

    var address = document.getElementById("customerAddress").value;
    var score = document.getElementById("scoreAmount").value;

    console.log(address);
    console.log(score);

    contractAddr.sendScoreToCustomer(address, score, {from: account});
    var eventSendScoreToCustomer = contractAddr.SendScoreToCustomer();
    eventSendScoreToCustomer.watch(function (error, event) {
        console.log(event.args.message);
        alert(event.args.message);

        eventSendScoreToCustomer.stopWatching();
    });
}

function getIssuedScoreAmount() {
    contractAddr.getIssuedScoreAmount({from: account}).then(function (result) {
        alert("已发行的积分总数为：" + result);
    });

}