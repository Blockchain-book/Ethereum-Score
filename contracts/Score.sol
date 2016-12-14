pragma solidity ^0.4.2;

contract Score {

    address owner; //合约的拥有者，银行

	mapping (address => uint) customerScore; //根据客户地址查找余额

    //构造函数
	function Score() {
		//balances[msg.sender] = 10000;
		owner = msg.sender;
	}

    //银行发送积分给客户,只能被银行调用
	function sendScoreToCustomer(address receiver, 
		uint amount) returns(bool sufficient) {
		//if (balances[msg.sender] < amount) return false;
		//balances[msg.sender] -= amount;
		customerScore[receiver] += amount;
		return true;
	}

	function getScoreWithCustomerAddr(address addr) returns(uint) {
		return customerScore[addr];
	}
}
