var currentAccount; //当前客户的账户地址

//根据客户address获取积分余额
function getScoreWithCustomerAddr() {
  console.log(currentAccount);
  contractAddr.getScoreWithCustomerAddr.call(currentAccount, {from: account}).then(function(value) {
    alert("当前余额：" + value.valueOf());
  }).catch(function(e) {
    console.log(e);
    setStatus("查询积分失败！");
  });
}

function alertCurrentCustomer() {
    alert(currentAccount);
}

