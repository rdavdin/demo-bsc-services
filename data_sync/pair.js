const {
  isQuote,
  isSupportFactory,
  getFactory,
  isUSDType,
  isWBNB,
} = require("./utils");
const PairModel = require("../models/Pair");
const Web3 = require("web3");
const axios = require("axios");

const TOKEN_API_URL = "http://localhost:3003/api/v1/token";

const web3 = new Web3("https://rpc.ankr.com/bsc");  //for process1
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io"); //for process2
// const web3 = new Web3("https://binance.nodereal.io"); //for process3
// const web3 = new Web3("https://bscrpc.com"); //for testing

const PAIR_CREATED_TOPIC = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9";
const GET_LOG_ERROR = 'GET_LOG_ERROR';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

class Pair {
  constructor() {
    this.crawledBlock = -1;
    this.pairs = {};
  }

  getPair(pair) {
    return this.pairs[pair];
  }

  async warmup() {
    console.log('warmup start');
    const startMs = Date.now();
    const totalDocs = await PairModel.estimatedDocumentCount();
    let totalSkip = 0;
    const step = 100000;
    do {
      console.log('totalSkip ', totalSkip);
      const dbPairs = await PairModel.find({})
        .sort("numberBlock")
        .select("address base quote blockNumber")
        .limit(step)
        .skip(totalSkip);

      dbPairs.forEach((p) => {
        if (this.crawledBlock < p.blockNumber)
          this.crawledBlock = p.blockNumber;
        this.pairs[p.address] = {
          pair: p.address,
          base: p.base,
          quote: p.quote,
        };
      });
      totalSkip += step;
    } while (totalSkip < totalDocs);

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
    console.log(
      `pairLogs.length ${pairLogs.length}, filteredLogs.length ${filteredLogs.length}`
    );

    let pairBatch = [];
    let newTokens = [];
    for (let i = 0; i < filteredLogs.length; i++) {
      const obj = this.createPair(filteredLogs[i]);
      if (!obj) continue;
      this.pairs[obj.address] = {
        pair: obj.address,
        base: obj.base,
        quote: obj.quote,
      };
      pairBatch.push(obj);
      if (!newTokens.find((t) => t == obj.base)) newTokens.push(obj.base);
    }

    // console.log(pairBatch);
    // console.log(newTokens);

    await this.storeDb(pairBatch);
    await this.storeTokens(newTokens);

    this.crawledBlock = toBlock;
    console.log(`this.crawledBlock updated ${this.crawledBlock}`);
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
        console.log(`Error insertMany ${error}`);
        await sleep(3000);
        await this.storeDb(pairBatch);
        console.log('storeDb again after 3s successfully');
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

    //just support quote tokens USDT types and WBNB
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

  async crawlPair(fromBlock, toBlock, batchSize = 500) {
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
      await sleep(30000);
      await this.crawlPair(this.crawledBlock + 1, toBlock, batchSize);
    }
  }

  async main() {
    await this.warmup();

    let latest = await web3.eth.getBlockNumber();
    const fromBlock = this.crawledBlock + 1;
    await this.crawlPair(fromBlock, latest);

    setInterval(async () => {
      latest = await web3.eth.getBlockNumber();
      await this.syncPairs(latest);
    }, 30000);
  }
}

module.exports = Pair;
