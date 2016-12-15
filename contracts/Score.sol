pragma solidity ^0.4.2;

contract Score {

    address owner; //合约的拥有者，银行

	mapping (address=>uint) customers; //根据客户地址查找余额
	mapping (address=>uint) merchants; //根据商户地址查找余额

    //增加权限控制，某些方法只能由合约的创建者调用
    modifier onlyOwner(){
		if(msg.sender != owner) throw;
		_;
	}

    //构造函数
	function Score() {
		owner = msg.sender;
	}

    //银行发送积分给客户,只能被银行调用，且只能发送给客户
	function sendScoreToCustomer(address receiver, 
		uint amount)onlyOwner returns(bool) {
		customers[receiver] += amount;
		return true;
	}

    //根据客户address查找余额
	function getScoreWithCustomerAddr(address addr)constant returns(uint) {
		return customers[addr];
	}

    //根据商户address查找余额
	function getScoreWithMerchantAddr(address addr)constant returns(uint) {
		return merchants[addr];
	}

	//客户之间转移积分
	function transferScoreToOtherCustomer(address sender, 
		address receiver, 
		uint amount)returns(bool) {
		if(customers[sender] < amount) return false;
		customers[sender] -= amount;
		customers[receiver] += amount;
		return true;
	}

	//商户之间转移积分
	function transferScoreToOtherMerchant(address sender,
		address receiver,
		uint amount)returns(bool) {
		if(merchants[sender] < amount) return false;
		merchants[sender] -= amount;
		customers[receiver] += amount;
		return true;
	}


}







