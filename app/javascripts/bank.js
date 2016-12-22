/**
 * Created by chenyufeng on 12/22/16.
 */

function issueScore() {

    var address = document.getElementById("customerAddress").value;
    var score = document.getElementById("scoreAmount").value;

    console.log(address);
    console.log(score);

    contractAddr.sendScoreToCustomer(address, score, {from: account});

}