pragma solidity ^0.4.2;

contract Utils {

	function stringToBytes32(string memory source)constant internal returns (bytes32 result) {
    assembly {
        result := mload(add(source, 32))
      }
    }

    function bytes32ToString(bytes32 x)constant internal returns (string) {
    bytes memory bytesString = new bytes(32);
    uint charCount = 0;
    for (uint j = 0; j < 32; j++) {
        byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
        if (char != 0) {
            bytesString[charCount] = char;
            charCount++;
        }
    }
    bytes memory bytesStringTrimmed = new bytes(charCount);
    for (j = 0; j < charCount; j++) {
        bytesStringTrimmed[j] = bytesString[j];
    }
    return string(bytesStringTrimmed);
    }

}

contract Score is Utils {

    address owner; //合约的拥有者，银行
    uint issueScoreAmount; //银行发行的积分总数
    uint settleScoreAmount; //银行已经清算的积分总数

    struct Customer {
    	address customerAddr; //客户address
    	bytes32 password; //客户密码
    	uint scoreAmount; //积分余额
    	bytes32[] goods; //购买的商品数组
    }

    struct Merchant {
    	address merchantAddr; //商户address
    	uint scoreAmount; //积分余额
    	bytes32[] goods; //发布的商品数组
    }

    struct Good {
    	bytes32 goodId; //商品Id;
    	uint price; //价格；
    	address belong; //商品属于哪个商户address；
    }

	mapping (address=>Customer) customer; 
	mapping (address=>Merchant) merchant; 
	mapping (bytes32=>Good) good; //根据商品Id查找该件商品

	address[] customers; //已注册的客户数组
	address[] merchants; //已注册的商户数组

    //增加权限控制，某些方法只能由合约的创建者调用
    modifier onlyOwner(){
		if(msg.sender != owner) throw;
		_;
	}

    //构造函数
	function Score() {
		owner = msg.sender;
	}

    //注册一个客户
	event NewCustomer(address sender, bool isSuccess, string message);
    function newCustomer(address _customerAddr, 
    	string _password) {

    	bool isSuccess;
    	string memory message;

        //判断是否已经注册
        if(!isCustomerAlreadyRegister(_customerAddr)) {
        	//还未注册
            customer[_customerAddr].customerAddr = _customerAddr;
    	    customers.push(_customerAddr);
    	    isSuccess = true;
    	    message = "注册成功";
        }
        else 
        {
            isSuccess = false;
        	message = "该账户已经注册";
        }
        	
        NewCustomer(msg.sender, isSuccess, message);
    }

    //判断一个客户是否已经注册
    function isCustomerAlreadyRegister(address _customerAddr)internal returns(bool) {
    	for(uint i = 0; i < customers.length; i++) {
    		if(customers[i] == _customerAddr) {
    			return true;
    		}
    	}
    	return false;
    }

    //设置用户密码
    event SetCustomerPassword(address sender, string message);
    function setCustomerPassword(address _customerAddr, 
    	string _password) {
            customer[_customerAddr].password = stringToBytes32(_password);
            SetCustomerPassword(msg.sender, "设置密码成功");
    }

    //注册一个商户
    function newMerchant(address _merchantAddr) returns(bool) {
    	merchant[_merchantAddr].merchantAddr = _merchantAddr;
    	customers.push(_merchantAddr);
    	return true;
    }

    //银行发送积分给客户,只能被银行调用，且只能发送给客户
	function sendScoreToCustomer(address receiver, 
		uint amount)onlyOwner returns(bool){

        for(uint i = 0; i < customers.length; i++) {
        	if(customers[i] == receiver) {
        		//该用户已经注册
        		issueScoreAmount += amount;
	        	customer[receiver].scoreAmount += amount;

	        	return true;
        	}
        }

        return false;
	}

    //根据客户address查找余额
	function getScoreWithCustomerAddr(address customerAddr)constant returns(uint) {
		return customer[customerAddr].scoreAmount;
	}

    //根据商户address查找余额
	function getScoreWithMerchantAddr(address merchantAddr)constant returns(uint) {
		return merchant[merchantAddr].scoreAmount;
	}

	//客户之间转移积分
	function transferScoreToOtherCustomer(address sender, 
		address receiver, 
		uint amount)returns(bool) {
		if(customer[sender].scoreAmount < amount) return false;
		customer[sender].scoreAmount -= amount;
		customer[receiver].scoreAmount += amount;
		return true;
	}

	//商户之间转移积分
	function transferScoreToOtherMerchant(address sender,
		address receiver,
		uint amount)returns(bool) {
		if(merchant[sender].scoreAmount < amount) return false;
		merchant[sender].scoreAmount -= amount;
		merchant[receiver].scoreAmount += amount;
		return true;
	}

	//商户和银行进行积分清算
	function settleScoreWithBank(address merchantAddr, 
		uint amount)returns(bool) {
		if(merchant[merchantAddr].scoreAmount < amount) return false;
		merchant[merchantAddr].scoreAmount -= amount;
		settleScoreAmount += amount;
		return true;
	}

	//商户添加一件商品
	function addGood(address merchantAddr, 
		bytes32 _goodId, 
		uint _price) returns(bool) {
		//判断商户是否已经注册
		for(uint i = 0; i < merchants.length ; i++) {
			if(customers[i] == merchantAddr) {
				//已经注册
				merchant[merchantAddr].goods.push(_goodId);
				good[_goodId].goodId = _goodId;
				good[_goodId].price = _price;
				good[_goodId].belong = merchantAddr;
			}
		}
		
		return true;
	}

	//商户查找自己的商品数组
	function getGoodsByMerchant(address merchantAddr)constant returns(bytes32[]) {
		return merchant[merchantAddr].goods;
	}

	//客户查找自己的商品数组
	function getGoodsByCustomer(address customerAddr)constant returns(bytes32[]) {
		return customer[customerAddr].goods;
	}

    //商户根据商品Id查询商品详情
    function getGoodDetail(address merchantAddr, 
    	bytes32 goodId)constant returns(bytes32, uint) {
    	//商户只能查找自己发布的商品详情
    	for(uint i = 0; i < merchant[merchantAddr].goods.length; i++) {
    		if(merchant[merchantAddr].goods[i] == goodId) {
    			//该商品属于该商户
    			return(goodId, good[goodId].price);
    		}
    	}

    	return (0x0, 0);
    }

    //用户用积分购买一件商品
    function buyGood(address customerAddr,
     bytes32 goodId) returns(bool) {
     	if(customer[customerAddr].scoreAmount < good[goodId].price) return false; //余额不足，购买失败

     	customer[customerAddr].scoreAmount -= good[goodId].price;
     	merchant[good[goodId].belong].scoreAmount += good[goodId].price;
     	customer[customerAddr].goods.push(goodId);
     	return true;
    }



}







