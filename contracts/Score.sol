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
    uint issuedScoreAmount; //银行已经发行的积分总数
    uint settledScoreAmount; //银行已经清算的积分总数

    struct Customer {
    	address customerAddr; //客户address
    	bytes32 password; //客户密码
    	uint scoreAmount; //积分余额
    	bytes32[] buyGoods; //购买的商品数组
    }

    struct Merchant {
    	address merchantAddr; //商户address
        bytes32 password; //商户密码
    	uint scoreAmount; //积分余额
    	bytes32[] sellGoods; //发布的商品数组
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
    bytes32[] goods; //已经上线的商品数组

    //增加权限控制，某些方法只能由合约的创建者调用
    modifier onlyOwner(){
		if(msg.sender != owner) throw;
		_;
	}

    //构造函数
	function Score() {
		owner = msg.sender;
	}

    //返回合约调用者地址
    function getOwner() constant returns(address) {
        return owner;
    }

    //注册一个客户,拆分设置密码的方法，解决out of gas
	event NewCustomer(address sender, bool isSuccess, string message);
    function newCustomer(address _customerAddr) {

        //判断是否已经注册
        if(!isCustomerAlreadyRegister(_customerAddr)) {
        	//还未注册
            customer[_customerAddr].customerAddr = _customerAddr;
    	    customers.push(_customerAddr);
            NewCustomer(msg.sender, true, "注册成功");
            return;
        }
        else {
            NewCustomer(msg.sender, false, "该账户已经注册");
            return;
        }
    }

    //注册一个商户
    event NewMerchant(address sender, bool isSuccess, string message);
    function newMerchant(address _merchantAddr) {

        //判断是否已经注册
        if(!isMerchantAlreadyRegister(_merchantAddr)) {
            //还未注册
            merchant[_merchantAddr].merchantAddr = _merchantAddr;
            merchants.push(_merchantAddr);
            NewMerchant(msg.sender, true, "注册成功");
            return;
        }
        else {
            NewMerchant(msg.sender, false, "该账户已经注册");
            return;
        }
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

    //判断一个商户是否已经注册
    function isMerchantAlreadyRegister(address _merchantAddr)internal returns(bool) {
        for(uint i = 0; i < merchants.length; i++) {
            if(merchants[i] == _merchantAddr) {
                return true;
            }
        }
        return false;
    }

    //设置用户密码
    event SetCustomerPassword(address sender, string message);
    function setCustomerPassword(address _customerAddr, string _password) {
            customer[_customerAddr].password = stringToBytes32(_password);
            SetCustomerPassword(msg.sender, "设置密码成功");
    }

    //设置商户密码
    event SetMerchantPassword(address sender, string message);
    function setMerchantPassword(address _merchantAddr, string _password) {
        merchant[_merchantAddr].password = stringToBytes32(_password);
        SetMerchantPassword(msg.sender, "设置密码成功");
    }

    //查询用户密码
    function getCustomerPassword(address _customerAddr)constant returns(bool, bytes32) {
        //先判断该用户是否注册
        if(isCustomerAlreadyRegister(_customerAddr)) {
            return (true, customer[_customerAddr].password);
        }
        else {
            return(false, "");
        }
    }

    //查询商户密码
    function getMerchantPassword(address _merchantAddr)constant returns(bool, bytes32) {
        //先判断该商户是否注册
        if(isMerchantAlreadyRegister(_merchantAddr)) {
            return (true, merchant[_merchantAddr].password);
        }
        else {
            return(false, "");
        }
    }

    //银行发送积分给客户,只能被银行调用，且只能发送给客户
    event SendScoreToCustomer(address sender, string message);
	function sendScoreToCustomer(address _receiver, 
		uint _amount)onlyOwner {

        if(isCustomerAlreadyRegister(_receiver)) {
            //已经注册
            issuedScoreAmount += _amount;
            customer[_receiver].scoreAmount += _amount;
            SendScoreToCustomer(msg.sender, "发行积分成功");
            return;
        }
        else {
            //还没注册
            SendScoreToCustomer(msg.sender, "该账户未注册，发行积分失败");
            return;
        }
	}

    //根据客户address查找余额
	function getScoreWithCustomerAddr(address customerAddr)constant returns(uint) {
		return customer[customerAddr].scoreAmount;
	}

    //根据商户address查找余额
	function getScoreWithMerchantAddr(address merchantAddr)constant returns(uint) {
		return merchant[merchantAddr].scoreAmount;
	}

	//两个账户转移积分，任意两个账户之间都可以转移，客户商户都调用该方法
    //_senderType表示调用者类型，0表示客户，1表示商户
    event TransferScoreToAnother(address sender, string message);
	function transferScoreToAnother(uint _senderType, 
        address _sender, 
		address _receiver, 
		uint _amount) {
        string memory message;
        if(!isCustomerAlreadyRegister(_receiver) && !isMerchantAlreadyRegister(_receiver)) {
            //目的账户不存在
            TransferScoreToAnother(msg.sender, "目的账户不存在，请确认后再转移！");
            return;
        }
        if(_senderType == 0) {
            //客户转移
            if(customer[_sender].scoreAmount >= _amount) {
                customer[_sender].scoreAmount -= _amount;
        
                if(isCustomerAlreadyRegister(_receiver)) {
                    //目的地址是客户
                    customer[_receiver].scoreAmount += _amount;
                }else {
                    merchant[_receiver].scoreAmount += _amount;
                }
                TransferScoreToAnother(msg.sender, "积分转让成功！");
                return;
          }else {
                TransferScoreToAnother(msg.sender, "你的积分余额不足，转让失败！");
                return;
          }
        }else {
            //商户转移
            if(merchant[_sender].scoreAmount >= _amount) {
                merchant[_sender].scoreAmount -= _amount;
                if(isCustomerAlreadyRegister(_receiver)) {
                    //目的地址是客户
                    customer[_receiver].scoreAmount += _amount;
                }else {
                    merchant[_receiver].scoreAmount += _amount;
                }
                TransferScoreToAnother(msg.sender, "积分转让成功！");
                return;
            }else {
                 TransferScoreToAnother(msg.sender, "你的积分余额不足，转让失败！");
                 return;
            }
        }
	}

    //银行查找已经发行的积分总数
    function getIssuedScoreAmount()constant returns(uint) {
        return issuedScoreAmount;
    }

	//（1）商户添加一件商品:（1）（2）（3）方法分拆解决out of gas
    event AddGood(address sender, bool isSuccess, string message);
	function addGood(address _merchantAddr, string _goodId, uint _price) {
        bytes32 tempId = stringToBytes32(_goodId);

        //首先判断该商品Id是否已经存在
        if(!isGoodAlreadyAdd(tempId)) {
            good[tempId].goodId = tempId;
            good[tempId].price = _price;
            good[tempId].belong = _merchantAddr;
            AddGood(msg.sender, true, "创建商品成功");
            return;
        }
        else {
            AddGood(msg.sender, false, "该件商品已经添加，请确认后操作");
            return;
        }
	}

    //（2）商户添加一件商品
    event PutGoodToArray(address sender, string message);
    function putGoodToArray(string _goodId) {
        goods.push(stringToBytes32(_goodId));  
        PutGoodToArray(msg.sender, "添加到全局商品数组成功");
    }

    //（3）商户添加一件商品
    event PutGoodToMerchant(address sender, string message);
    function putGoodToMerchant(address _merchantAddr, string _goodId) {
         merchant[_merchantAddr].sellGoods.push(stringToBytes32(_goodId)); 
         PutGoodToMerchant(msg.sender, "添加到商户的商品数组成功");
    }

	//商户查找自己的商品数组
	function getGoodsByMerchant(address _merchantAddr)constant returns(bytes32[]) {
		return merchant[_merchantAddr].sellGoods;
	}

    //（1）用户用积分购买一件商品,拆分方法，解决out of gas
    event BuyGood(address sender, bool isSuccess, string message);
    function buyGood(address _customerAddr, string _goodId) {
        //首先判断输入的商品Id是否存在
        bytes32 tempId = stringToBytes32(_goodId);
        if(isGoodAlreadyAdd(tempId)) {
            //该件商品已经添加，可以购买
            if(customer[_customerAddr].scoreAmount < good[tempId].price) {
                BuyGood(msg.sender, false, "余额不足，购买商品失败");
                return;
            }
            else {
                //对这里的方法抽取      
                BuyGood(msg.sender, true, "购买商品成功");
                return;
            }
        }
        else {
            //没有这个Id的商品
            BuyGood(msg.sender, false, "输入商品Id不存在，请确定后购买");
            return;
        }
    }

    //（2）对上面buyGood()方法的拆分
    function buyGoodSuccess(address _customerAddr, string _goodId) {
         bytes32 tempId = stringToBytes32(_goodId);
         customer[_customerAddr].scoreAmount -= good[tempId].price;
         merchant[good[tempId].belong].scoreAmount += good[tempId].price;
         customer[_customerAddr].buyGoods.push(tempId);
    }

	//客户查找自己的商品数组
	function getGoodsByCustomer(address _customerAddr)constant returns(bytes32[]) {
		return customer[_customerAddr].buyGoods;
	}

    //首先判断输入的商品Id是否存在
    function isGoodAlreadyAdd(bytes32 _goodId)internal returns(bool) {
        for(uint i = 0; i < goods.length; i++) {
            if(goods[i] == _goodId) {
                return true;
            }
        }
        return false;
    }













    //根据商品Id查询商品详情
    /*
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
    */









}







