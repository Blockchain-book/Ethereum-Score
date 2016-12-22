var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Score error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Score error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Score contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Score: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Score.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Score not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "customerAddr",
            "type": "address"
          }
        ],
        "name": "getGoodsByCustomer",
        "outputs": [
          {
            "name": "",
            "type": "bytes32[]"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "customerAddr",
            "type": "address"
          }
        ],
        "name": "getScoreWithCustomerAddr",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "sender",
            "type": "address"
          },
          {
            "name": "receiver",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transferScoreToOtherCustomer",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "merchantAddr",
            "type": "address"
          }
        ],
        "name": "getScoreWithMerchantAddr",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "merchantAddr",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "settleScoreWithBank",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "merchantAddr",
            "type": "address"
          },
          {
            "name": "goodId",
            "type": "bytes32"
          }
        ],
        "name": "getGoodDetail",
        "outputs": [
          {
            "name": "",
            "type": "bytes32"
          },
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "merchantAddr",
            "type": "address"
          },
          {
            "name": "_goodId",
            "type": "bytes32"
          },
          {
            "name": "_price",
            "type": "uint256"
          }
        ],
        "name": "addGood",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_merchantAddr",
            "type": "address"
          }
        ],
        "name": "newMerchant",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_customerAddr",
            "type": "address"
          },
          {
            "name": "_password",
            "type": "string"
          }
        ],
        "name": "setCustomerPassword",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getOwner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "sender",
            "type": "address"
          },
          {
            "name": "receiver",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "transferScoreToOtherMerchant",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "customerAddr",
            "type": "address"
          },
          {
            "name": "goodId",
            "type": "bytes32"
          }
        ],
        "name": "buyGood",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_receiver",
            "type": "address"
          },
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "sendScoreToCustomer",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "merchantAddr",
            "type": "address"
          }
        ],
        "name": "getGoodsByMerchant",
        "outputs": [
          {
            "name": "",
            "type": "bytes32[]"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_customerAddr",
            "type": "address"
          }
        ],
        "name": "getCustomerPassword",
        "outputs": [
          {
            "name": "",
            "type": "bytes32"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_customerAddr",
            "type": "address"
          },
          {
            "name": "_password",
            "type": "string"
          }
        ],
        "name": "newCustomer",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [],
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "isSuccess",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "NewCustomer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "SetCustomerPassword",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "SendScoreToCustomer",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052600080546c0100000000000000000000000033810204600160a060020a0319909116179055610cb1806100376000396000f3606060405236156100c45760e060020a600035046332a841b381146100c957806336eed01f1461014c57806354e0577f1461017957806358d7fa69146101b65780635909b7f8146101e25780635be21fbd1461021c57806363521bbf146102a95780636c0b2fa71461035357806370f2eccc146103be578063893d20e814610414578063a4403f5014610441578063ab8c0ec81461047e578063aecf2149146104c6578063c3b81e2214610501578063d396223914610583578063fe063351146105af575b610002565b346100025761065e60043560408051602081810183526000808352600160a060020a0385168152600380835290849020018054845181840281018401909552808552929392909183018282801561014057602002820191906000526020600020905b8154815260019091019060200180831161012b575b50505050509050610174565b34610002576106a8600435600160a060020a0381166000908152600360205260409020600201545b919050565b34610002576106ba600435602435604435600160a060020a038316600090815260036020526040812060020154829010156106e957506000610721565b34610002576106a8600435600160a060020a038116600090815260046020526040902060010154610174565b34610002576106ba600435602435600160a060020a0382166000908152600460205260408120600101548290101561072857506000610756565b34610002576106ce600435602435600080805b600160a060020a03851660009081526004602052604090206002015481101561075c57600160a060020a03851660009081526004602052604090206002018054859190839081101561000257600091825260209091200154141561076c576000848152600560205260409020600101548493509150610764565b34610002576106ba6004356024356044356000805b6007548110156107745784600160a060020a0316600660005082815481101561000257600091825260209091200154600160a060020a031614156107c457600160a060020a0385166000908152600460205260409020600201805460018101808355828183801582901161077f5760008381526020902061077f9181019083015b808211156107cc576000815560010161033f565b34610002576106ba600435600160a060020a03811660009081526004602052604081208054606060020a80850204600160a060020a0319909116179055600680546001810180835582818380158290116107d0576000838152602090206107d091810190830161033f565b346100025760408051602060046024803582810135601f81018590048502860185019096528585526106e7958335959394604494939290920191819084018382808284375050519395509293506107ff92505050565b3461000257600054600160a060020a031660408051600160a060020a039092168252519081900360200190f35b34610002576106ba600435602435604435600160a060020a0383166000908152600460205260408120600101548290101561088d57506000610721565b34610002576106ba600435602435600081815260056020908152604080832060010154600160a060020a0386168452600390925282206002015410156108c857506000610756565b34610002576106e760043560243560408051602081019091526000808252805490919033600160a060020a0390811691161461097157610002565b346100025761065e60043560408051602081810183526000808352600160a060020a0385168152600482528390206002018054845181840281018401909552808552929392909183018282801561014057602002820191906000526020600020908154815260019091019060200180831161012b575b50505050509050610174565b34610002576106a8600435600160a060020a038116600090815260036020526040902060010154610174565b346100025760408051602060046024803582810135601f81018590048502860185019096528585526106e795833595939460449493929092019181908401838280828437509496505050505050506040805160208101909152600080825290610ae7845b6000805b600654811015610c9e5782600160a060020a0316600660005082815481101561000257600091825260209091200154600160a060020a03161415610ca95760019150610ca3565b60405180806020018281038252838181518152602001915080519060200190602002808383829060006004602084601f0104600302600f01f1509050019250505060405180910390f35b60408051918252519081900360200190f35b604080519115158252519081900360200190f35b6040805192835260208301919091528051918290030190f35b005b50600160a060020a03808416600090815260036020526040808220600290810180548690039055928516825290200180548201905560015b9392505050565b50600160a060020a038216600090815260046020526040902060019081018054839003905560028054830190555b92915050565b600092508291505b509250929050565b60010161022f565b506001949350505050565b50505060009283525060208083209091018690558582526005905260409020848155600181018490556002018054600160a060020a031916606060020a878102041790555b6001016102be565b5090565b5050506000928352506020909120018054600160a060020a031916606060020a84810204179055506001610174565b600160a060020a038084166000908152600360209081526040918290206001019390935580513390921682529181018290526012818301527fe8aebee7bdaee5af86e7a081e68890e58a9f0000000000000000000000000000606082015290517f1db7e17e6810874ec64cf3eb4bced0c8ba5f49fdec1724a1566bf3ddb59b830a9181900360800190a15050565b50600160a060020a03808416600090815260046020526040808220600190810180548690039055928516825290208101805483019055610721565b600082815260056020908152604080832060018082018054600160a060020a03808b168089526003808952878a20600280820180549690960390955594549390960154909116885260048752948720830180549091019055929094529182905201805491820180825590919082818380158290116109575760008381526020902061095791810190830161033f565b505050600092835250602090912001829055506001610756565b61097a84610613565b156109e357506001805483019055600160a060020a0383166000908152600360209081526040918290206002018054850190558151808301909252601282527fe58f91e8a18ce7a7afe58886e68890e58a9f000000000000000000000000000090820152610a41565b5060408051606081018252602781527fe8afa5e8b4a6e688b7e69caae6b3a8e5868cefbc8ce58f91e8a18ce7a7afe58860208201527f86e5a4b1e8b4a500000000000000000000000000000000000000000000000000918101919091525b7f1085e80f1c104f322185083fe0ba65ddf4ea2040fcb9ad9fdd689ed4ccd5b8b333826040518083600160a060020a03168152602001806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f168015610ad35780820380516001836020036101000a031916815260200191505b50935050505060405180910390a150505050565b1515610b4b57600160a060020a03841660009081526003602052604090208054600160a060020a031916606060020a8087020417905560068054600181018083558281838015829011610c3557600083815260209020610c3591810190830161033f565b505060408051808201909152601581527fe8afa5e8b4a6e688b7e5b7b2e7bb8fe6b3a8e5868c000000000000000000000060208201526000905b7f424c8c8b87e9d8aa2fd6e4f51280fcbd5c97d97d937a00c69a3f1e89164b5b593383836040518084600160a060020a031681526020018315158152602001806020018281038252838181518152602001915080519060200190808383829060006004602084601f0104600302600f01f150905090810190601f168015610c205780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a150505050565b505050600092835250602091829020018054600160a060020a031916606060020a8781020417905560408051808201909152600c81527fe6b3a8e5868ce68890e58a9f000000000000000000000000000000000000000091810191909152600192509050610b85565b600091505b50919050565b60010161061756",
    "events": {
      "0x6dbea36c469fff206e23ae314ad3e4b5816629800143cb849cea9c97cef466c3": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "isSuccess",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "msg",
            "type": "string"
          }
        ],
        "name": "SendScoreToCustomer",
        "type": "event"
      },
      "0x71d66a821265c8b2791705874b4f2ec471bb044445f09d8f40f1d700a7cb2e1f": {
        "anonymous": false,
        "inputs": [],
        "name": "SendScoreToCustomer",
        "type": "event"
      },
      "0x9845306af6d97af275ddc8237652336e34c572a23e63d2144eca2bf5182077a5": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "isSussecc",
            "type": "bool"
          }
        ],
        "name": "SendScoreToCustomer",
        "type": "event"
      },
      "0x49b8f73ede7e3add061b44b8290927d0f2dbdd6f7aad5c7e110893c40e51c861": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "_from",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "_value",
            "type": "int256"
          }
        ],
        "name": "ReturnValue",
        "type": "event"
      },
      "0x00d224d71996dfcee4c245633d847c31fada086791714b317b4fdba5f09b823a": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "bool"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x733ac170e99e7d335bfb77222b44285217f54dc4067f5f35c251e0a33cf85237": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "uint256"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x953471650d3a9eed992cf713af29c5f06872ed8f678dc9bf12130cdd92a85d98": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "result",
            "type": "uint256"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x518ae0b0868474c4b6372607e02309498f7f3d33bc4ffacdb0488b48cdda393f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "string"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x8f2091ba12d9163c6ee076eb979fff327bed618cb6a8d91be26d0997304ce6c5": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "int256"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0xac537a60438c64b6ac0ac3b1feadc4ad98e7cbca8bd3ecc7be59ea34b32c055f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "bytes32"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x9047045baf36856aebf364d94e7a5e87c7bb4c1a5f06ec951bbd993c897c4fae": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "result",
            "type": "int256"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x1397cb2757dc7ed5de32fecf235b359c3f348e1a15ae008258b31834fb56aa7c": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "address"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x22d897b236e1baa6ee9b04cce71566d3baa036bb6c9fea4daded6caf299beff5": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "int256[]"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x0c6243ccf5107e30934fba300452993710c58167c68eacd43eea29a4be69886b": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result",
            "type": "bytes32[]"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x2edaf3d4f05cb905a6c815686d97a96a918f6fe7c08bca0d1f9fd0ef1212c6d8": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result1",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "result2",
            "type": "int256"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0xcce7a3cb99ad10977a49ce9b0915860a8f2404586d45f2da200214e3366644fa": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "result1",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "result2",
            "type": "int256"
          },
          {
            "indexed": false,
            "name": "result3",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "result4",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "result5",
            "type": "address"
          }
        ],
        "name": "LogRegStatus",
        "type": "event"
      },
      "0x424c8c8b87e9d8aa2fd6e4f51280fcbd5c97d97d937a00c69a3f1e89164b5b59": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "isSuccess",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "NewCustomer",
        "type": "event"
      },
      "0x8a0a067614a3e664c1af184b9b4307ab9aeeaa89bdd1008005c192fbcb3029a5": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "isSuccess",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "msg",
            "type": "int256"
          }
        ],
        "name": "NewCustomer",
        "type": "event"
      },
      "0x60096795c1a700f16ab5fd21ba8fc36fc49a8294c8f54c95630b3024ccaeb67e": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "isSuccess",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "msg",
            "type": "bytes32"
          }
        ],
        "name": "NewCustomer",
        "type": "event"
      },
      "0x1db7e17e6810874ec64cf3eb4bced0c8ba5f49fdec1724a1566bf3ddb59b830a": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "SetCustomerPassword",
        "type": "event"
      },
      "0xeff8e1a4164d16ca28aaafb7eb65846dfc53d267d62a74ee293a4b5e9b1d46ac": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "isSuccess",
            "type": "bool"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "SendScoreToCustomer",
        "type": "event"
      },
      "0x1085e80f1c104f322185083fe0ba65ddf4ea2040fcb9ad9fdd689ed4ccd5b8b3": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "message",
            "type": "string"
          }
        ],
        "name": "SendScoreToCustomer",
        "type": "event"
      }
    },
    "updated_at": 1482419369429,
    "links": {},
    "address": "0x06bfaeb3d71a9d1dd3c6898f3957013df08ccfa0"
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Score";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Score = Contract;
  }
})();
