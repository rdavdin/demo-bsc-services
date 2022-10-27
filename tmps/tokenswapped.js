/**
 * Requirement:
 * collect all swap Ts with joining of a specific token in a range of blocks
 * [{
 *    isBuy
 *    amount
 * }, ...]
 */
/**
 * the data of one real swap:
 * Log:
 * - Address: 0x4311ed024fb8c60fC010D0E99e93E1a7935e8c1d (Contract PancakeSwap V2: Fiwa-Busd which was created by PancakeSwap: Factory V2)
 *    + token0 --> Fiwa
 *    + token1 --> Busd
 * - Swap (index_topic_1 address sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, index_topic_2 address to)
 * - Topics:
 * 0  0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822
 * 1  0x10ed43c718714eb63d5aa57b78b54704e256024e  --> Contract PancakeSwap: Router V2
 * 2  0xd68018a8e35b846498a15a76e248311880109fc5  --> The address (user) operated the swap operation
 * - Data:
 * amount0In : 166666250000000000000000
 * amount1In : 0
 * amount0Out : 0
 * amount1Out : 21777371756892182699
 * --> Fiwa-Busd contract received token0 (Fiwa) and returned token1 (Busd)
 * --> The address (user) sold Fiwa token
 */

const Web3 = require("web3");
// const web3 = new Web3("https://rpc.ankr.com/bsc");
const web3 = new Web3("https://bscrpc.com");

const SWAP_TOPIC =
  "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
const PAIR_CREATED_TOPIC =
  "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9";
// const CAKE_ADDR = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82".toLowerCase();
const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955".toLowerCase();
// const FIWA_ADDR = "0x633237C6FA30FAe46Cc5bB22014DA30e50a718cC".toLowerCase();

const LAST_BLOCK_N = 20;

const erc20ABI = require("./Erc20.json");
const lpContractABI = require("./PancakePair.json");


async function getSymbol(tokenAddr) {
  const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddr);
  const tokenSymbol = await tokenContract.methods.symbol().call();
  return tokenSymbol;
}

async function getPair(pairAddr) {
  const pairContract = new web3.eth.Contract(lpContractABI, pairAddr);

  const name = await pairContract.methods.name().call();
  let token0 = await pairContract.methods.token0().call();
  let token1 = await pairContract.methods.token1().call();
  token0 = token0.toLowerCase();
  token1 = token1.toLowerCase();

  const token0Contract = new web3.eth.Contract(erc20ABI, token0);
  const token0Symbol = await token0Contract.methods.symbol().call();
  const token1Contract = new web3.eth.Contract(erc20ABI, token1);
  const token1Symbol = await token1Contract.methods.symbol().call();

  return { name, token0, token0Symbol, token1, token1Symbol };
}

/**
 * topics: indexed parameters
 */
function decodeLogData(data, topics) {
  const inputs = [
    {
      type: "uint256",
      name: "amount0In",
    },
    {
      type: "uint256",
      name: "amount1In",
    },
    {
      type: "uint256",
      name: "amount0Out",
    },
    {
      type: "uint256",
      name: "amount1Out",
    },
  ];
  return web3.eth.abi.decodeLog(inputs, data, topics);
}

function getReadableLog(decodedData, tokenIs0){
  let result = {};
  result.isBuy = false;

  if((tokenIs0 && decodedData.amount0In == '0') ||
      (!tokenIs0 && decodedData.amount1In == '0')){
        result.isBuy = true;
  }

  if(result.isBuy){
    if(tokenIs0){
      result.amount = decodedData.amount0Out;
    }else{
      result.amount = decodedData.amount1Out;
    }
  }else{
    if(tokenIs0){
      result.amount = decodedData.amount0In;
    }else{
      result.amount = decodedData.amount1In;
    }
  }
  result.amount = web3.utils.fromWei(result.amount);
  return result;
}

async function collectSwapTxList(tokenAddr, fromBlock, toBlock) {
  const options = {
    fromBlock,
    toBlock,
    topics: [
      "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
    ],
  };
  let logs = await web3.eth.getPastLogs(options);
  console.log(`logs.length ${logs.length}`);
  logs = logs.slice(0, 100);

  let promises = logs.map((log) => getPair(log.address));
  let promisesResults = await Promise.all(promises);
  // for(let i = 0; i < results.length; i++){
  //   const {name, token0, token0Symbol, token1, token1Symbol} = results[i];
  //   console.log(token0, token0Symbol, token1, token1Symbol);
  // }
  const filteredLogs = logs.filter((log, index) => {
    const { token0, token1 } = promisesResults[index];
    if (token0 == tokenAddr) {
      log.tokenIs0 = true;
    }
    return token0 == tokenAddr || token1 == tokenAddr;
  });

  // const aLog = filteredLogs[0];
  // console.log(aLog);

  // console.log(logs.length, filteredLogs.length);
  const results = filteredLogs.map(log => {
    console.log(log.blockNumber, log.logIndex);
    const decodedData = decodeLogData(log.data, [log.topics[1], log.topics[2]]);
    return getReadableLog(decodedData, log.tokenIs0);
  })

  console.log(results);
}

async function main() {
  try {
    const latest = await web3.eth.getBlockNumber();
    console.log(`latestBlock ${latest}`);
    const fromBlock = latest - LAST_BLOCK_N + 1;
    collectSwapTxList(USDT_ADDR, fromBlock, latest);
  } catch (error) {
    console.log(error);
  }
}

main();
