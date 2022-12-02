const {
  isQuote,
  isSupportFactory,
  getFactory,
  isUSDType,
  isWBNB,
} = require("./bsc");
const PairModel = require("../models/Pair");
const Web3 = require("web3");
const axios = require("axios");

const TOKEN_API_URL = "http://localhost:3003/api/v2/token";

const batchSize = 1000;
let web3 = new Web3("https://rpc.ankr.com/bsc");  //for process1

const rpcList = [
  "https://rpc.ankr.com/bsc",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed3.ninicoin.io",
  "https://bsc-dataseed4.binance.org",
  "https://bsc-dataseed4.ninicoin.io",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed3.defibit.io",
];
let currentUrp = 0;
let rpcMs = 0;

function changeRpc(){
  rpcMs = Date.now();
  currentUrp++;
  if(currentUrp == rpcList.length) currentUrp = 0;
  web3 = new Web3(rpcList[currentUrp]);
}

const PAIR_CREATED_TOPIC = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9";
const GET_LOG_ERROR = 'GET_LOG_ERROR';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const STARTING_BLOCK = 6810423;

class Pair {
  constructor() {
    this.crawledBlock = STARTING_BLOCK-1;
  }

  async getPair(address) {
    address = address.toLowerCase();
    const pair = await PairModel.findOne({address: address}).select('address base quote -_id');
    return pair;
  }

  async warmup() {
    const startMs = Date.now();
    const pair = await PairModel.find().sort({blockNumber:-1}).limit(1);
    if(pair[0]) this.crawledBlock = pair[0].blockNumber;
    console.log(
      `warmup end - ${Date.now() - startMs} ms! crawledBlock ${
        this.crawledBlock
      }`
    );
  }

  async syncPairs(toBlock) {
    if (toBlock <= this.crawledBlock) return;
    const fromBlock = this.crawledBlock + 1;

    const options = {
      fromBlock,
      toBlock,
      topics: [PAIR_CREATED_TOPIC],
    };

    console.log(`fromBlock: ${fromBlock}, toBlock: ${toBlock}`);
    let pairLogs = [];
    try {
      pairLogs = await web3.eth.getPastLogs(options);
    } catch (error) {
      error.msg = GET_LOG_ERROR;
      throw error;
    }
    const filteredLogs = pairLogs.filter((log) => isSupportFactory(log.address));
    // console.log(
    //   `pairLogs.length ${pairLogs.length}, filteredLogs.length ${filteredLogs.length}`
    // );

    let pairBatch = [];
    let newTokens = [];
    for (let i = 0; i < filteredLogs.length; i++) {
      const obj = this.createPair(filteredLogs[i]);
      if (!obj) continue;
      pairBatch.push(obj);
      if (!newTokens.find((t) => t == obj.base)) newTokens.push(obj.base);
    }

    // console.log(pairBatch);
    // console.log(newTokens);

    await this.storeDb(pairBatch);
    await this.storeTokens(newTokens);

    this.crawledBlock = toBlock;
    console.log(`Pair: crawledBlock updated: ${this.crawledBlock}`);
  }

  async storeTokens(tokens) {
    // console.log({tokens}, tokens.length);
    if (!tokens.length) return;
    const res = await axios.post(`${TOKEN_API_URL}/tokens`, { tokens });
    // console.log(`response from token service ${res.data.status}`);
  }

  async storeDb(pairBatch) {
    if (!pairBatch.length) return;
    try {
      await PairModel.insertMany(pairBatch, { ordered: false });
    } catch (error) {
      if(error.code === 11000){ //ignore duplicate
        console.log(`Ignore duplicate error`);
      }else{
        console.log(`Pair: Error insertMany ${error}`);
        console.log(`the inserted batch `);
        console.log({pairBatch});
      }
    }
  }

  createPair(log) {
    const token0 = web3.eth.abi
      .decodeParameters(["address"], log.topics[1])[0]
      .toLowerCase();
    const token1 = web3.eth.abi
      .decodeParameters(["address"], log.topics[2])[0]
      .toLowerCase();
    const pair = web3.eth.abi
      .decodeParameters(["address"], log.data)[0]
      .toLowerCase();

    let obj = {
      address: pair,
      factory: getFactory(log.address),
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
    };

    //just support quote tokens USD types and WBNB
    if (isUSDType(token0)) {
      obj.base = token1;
      obj.quote = token0;
    } else if (isUSDType(token1)) {
      obj.base = token0;
      obj.quote = token1;
    } else if (isWBNB(token0)) {
      obj.base = token1;
      obj.quote = token0;
    } else if (isWBNB(token1)) {
      obj.base = token0;
      obj.quote = token1;
    } else {
      return undefined; //this pair is not supported
    }
    return obj;
  }

  async crawlPair(fromBlock, toBlock, batchSize = 1000) {
    try {
      this.crawledBlock = fromBlock - 1;
      const latest = toBlock ? toBlock : await web3.eth.getBlockNumber();
      let to = fromBlock + batchSize;
      while (to < latest) {
        await this.syncPairs(to);
        to += batchSize;
      }
      await this.syncPairs(latest);
      console.log(`crawlPair done: fromBlock ${fromBlock}, toBlock ${latest}`);
    } catch (error) {
      console.log(error);
      rpcMs = Date.now() - rpcMs;
      if(rpcMs < 30000){
        await sleep(30000 - rpcMs);
      }
      changeRpc();
      await this.crawlPair(this.crawledBlock + 1, toBlock, batchSize);
    }
  }

  async main() {
    await this.warmup();

    rpcMs = Date.now();
    let isLoop = false;
    let latest = await web3.eth.getBlockNumber();
    do {
      const fromBlock = this.crawledBlock + 1;
      await this.crawlPair(fromBlock, latest);
      latest = await web3.eth.getBlockNumber();
      isLoop = (latest - this.crawledBlock) > batchSize ? true : false;
    } while (isLoop);
    console.log(`Pair: data synced to block latest ${latest}`);
    
    setInterval(async () => {
      latest = await web3.eth.getBlockNumber();
      await this.syncPairs(latest);
    }, 30000);
  }
}

module.exports = Pair;
