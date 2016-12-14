pragma solidity ^0.4.2;

contract Score {
	mapping (address => uint) balances;

	function Score() {
		balances[msg.sender] = 10000;
	}

	function sendScore(address receiver, 
		uint amount) returns(bool sufficient) {
		if (balances[msg.sender] < amount) return false;
		balances[msg.sender] -= amount;
		balances[receiver] += amount;
		return true;
	}

	function getBalance(address addr) returns(uint) {
		return balances[addr];
	}
}
