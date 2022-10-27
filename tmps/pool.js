/**
* 2. collect pairs created in a range of blocks
* Output:
* [
* {
* address,
* token0,
* token1,
* symbol0,
* symbol1
* },
* ...
* ]
*/

/**
A real PairCreated log:
Address: 0xca143ce32fe78f1f7019d7d551a6402fc5350c73 --> PancakeSwap: Factory V2
Name
PairCreated (index_topic_1 address token0, index_topic_2 address token1, address pair,)

Topics
0  0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9 
1  0x55d398326f99059ff775485246999027b3197955  --> token0 address (USDT)
2  0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c  --> token1 address (WBNB)
Data
pair: 0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae  --> Pool address created
 */

const Web3 = require('web3');

// const web3 = new Web3("https://rpc.ankr.com/bsc");
const web3 = new Web3("https://bscrpc.com");

const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
const PANCAKE_FACTORY = '0xca143ce32fe78f1f7019d7d551a6402fc5350c73';
const N_LAST_BLOCK = 2000; 

function decodeLogData(data, topics) {
  const inputs = [
    {
      type: "address",
      name: "token0",
      indexed: true
    },
    {
      type: "address",
      name: "token1",
      indexed: true
    },
    {
      type: "address",
      name: "pair"
    }
  ];
  return web3.eth.abi.decodeLog(inputs, data, topics);
}

async function crawlPairsCreated(fromBlock = 'latest', toBlock = 'latest'){
  const options = {
    fromBlock,
    toBlock,
    address: PANCAKE_FACTORY,
    topics: [
      PAIR_CREATED_TOPIC
    ]
  };

  const logs = await web3.eth.getPastLogs(options);
  console.log(`logs.length ${logs.length}`);

  const aLog = logs[0];
  console.log(aLog);

  const result = decodeLogData(aLog.data, aLog.topics.slice(1));
  console.log(result);

}

async function main(){
  try {
    const latest = await web3.eth.getBlockNumber();
    console.log(`latestBlock ${latest}`);
    const fromBlock = latest - N_LAST_BLOCK + 1;
    crawlPairsCreated(fromBlock, latest);
  } catch (error) {
    console.log(error);
  }




  //cake-busd : 0x804678fa97d91B974ec2af3c843270886528a9E6
  //price0CumulativeLast: 2910719499940797549480370756797041730211811
  //price1CumulativeLast: 32566255659428155299832020057647196580199

  //getReserves(_reserve0 uint112, _reserve1 uint112, _blockTimestampLast uint32)
  //_reserve0:  1663092485870725215371108
  //_reserve1:  7323104094064160496312469
}

main();