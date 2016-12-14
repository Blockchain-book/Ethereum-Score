pragma solidity ^0.4.2;

contract Score {

    address owner; //合约的拥有者，银行

	mapping (address => uint) customerScore; //根据客户地址查找余额

    //增加权限控制，某些方法只能由合约的创建者调用
    modifier onlyOwner(){
		if(msg.sender != owner) throw;
		_;
	}

    //构造函数
	function Score() {
		owner = msg.sender;
	}

    //银行发送积分给客户,只能被银行调用
	function sendScoreToCustomer(address receiver, 
		uint amount)onlyOwner returns(bool sufficient) {
		customerScore[receiver] += amount;
		return true;
	}

	function getScoreWithCustomerAddr(address addr) returns(uint) {
		return customerScore[addr];
	}
}
