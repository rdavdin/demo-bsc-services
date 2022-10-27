const { isQuote, isSupportFactory, getFactory, isUSDType, isWBNB } = require('./utils');
const PairModel = require('../models/Pair');
const Web3 = require('web3');

const web3 = new Web3("https://rpc.ankr.com/bsc");  //for process1
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io"); //for process2
// const web3 = new Web3("https://binance.nodereal.io"); //for process3
// const web3 = new Web3("https://bscrpc.com");  //for testing

const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';

class Pair {
  constructor(){
    this.crawledBlock = -1;
    this.pairs = {}
  }

  getPair(pair){
    return this.pairs[pair];
  }

  async warmup(){
    const dbPairs = await PairModel.find({}).sort('numberBlock').select('address base quote blockNumber');
    dbPairs.forEach(p => {
      if(this.crawledBlock < p.blockNumber) this.crawledBlock = p.blockNumber;
      this.pairs[p.address] = {pair: p.address, base: p.base, quote: p.quote};
    });

    console.log(`this.crawedBlock after warmup ${this.crawledBlock}`);
  }

  async syncPairs(toBlock){
    try {
      if(toBlock <= this.crawledBlock) return;
      const fromBlock = this.crawledBlock + 1;
  
      const options = {
        fromBlock,
        toBlock,
        topics: [
          PAIR_CREATED_TOPIC
        ]
      };
  
      console.log(`fromBlock: ${fromBlock}, toBlock: ${toBlock}`);
      const pairLogs = await web3.eth.getPastLogs(options);
  
      const filteredLogs = pairLogs.filter(log => isSupportFactory(log.address));
      console.log(`pairLogs.length ${pairLogs.length}, filteredLogs.length ${filteredLogs.length}`);

      let pairBatch = [];
      filteredLogs.forEach(async (log) => {
        const token0 = web3.eth.abi.decodeParameters(['address'], log.topics[1])[0];
        const token1 = web3.eth.abi.decodeParameters(['address'], log.topics[2])[0];
        const pair = web3.eth.abi.decodeParameters(['address'], log.data)[0];
        await this.checkAndStore(token0.toLowerCase(), token1.toLowerCase(), pair.toLowerCase(), log);
      });
  
      this.crawledBlock = toBlock;
      console.log(`this.crawledBlock updated ${this.crawledBlock}`);
    } catch (error) {
      throw new Error('abc');
    }
  }

  processLog(log){
    const token0 = web3.eth.abi.decodeParameters(['address'], log.topics[1])[0].toLowerCase();
    const token1 = web3.eth.abi.decodeParameters(['address'], log.topics[2])[0].toLowerCase();
    const pair = web3.eth.abi.decodeParameters(['address'], log.data)[0].toLowerCase();

    let obj = {
      address: pair,
      factory: getFactory(log.address),
      blockNumber: log.blockNumber,
      txHash: log.transactionHash
    };

    if(isUSDType(token0)){
      obj.base = token1;
      obj.quote = token0;
    }else if(isUSDType(token1)){
      obj.base = token0;
      obj.quote = token1;
    }else if(isWBNB(token0)){
      obj.base = token1;
      obj.quote = token0;
    }else if(isWBNB(token1)){
      obj.base = token0;
      obj.quote = token1;
    }else{
      return undefined; //this pair is not supported
    }

    return obj;
  }

  async checkAndStore(token0, token1, pair, log){
    let obj = {
      address: pair,
      factory: getFactory(log.address),
      blockNumber: log.blockNumber,
      txHash: log.transactionHash
    };
    if(isQuote(token1)){
      obj.base = token0;
      obj.quote = token1;
    }else if(isQuote(token0)){
      obj.base = token1;
      obj.quote = token0;
    }else{
      return;
    }
    try {
      const aPair = await PairModel.create(obj);
      this.pairs[obj.address] = {pair: obj.address, base: obj.base, quote: obj.quote};
    } catch (error) {
      console.log(`Cannot create pair ${obj.address}`);
      console.log(error);
    }
  }
  

  async crawlPair(fromBlock, toBlock, batchSize = 1000){
    try {
      this.crawledBlock = fromBlock - 1;
      const latest = toBlock ? toBlock : await web3.eth.getBlockNumber();
      let to = fromBlock + batchSize;
  
      while(to < latest){
        await this.syncPairs(to);
        to += batchSize;
      }
      await this.syncPairs(latest);

      console.log(`crawlPair done: fromBlock ${fromBlock}, toBlock ${latest}`);
    } catch (error) {
      console.log(`error from crawlPair`);
      console.log(error);
      setTimeout(() => {
        this.crawlPair(this.crawledBlock + 1, toBlock);
      }, 30000);
    }
  }

  
  async main(){
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

require("dotenv").config();
const connectDB = require("../db/connect");
async function main(){
  try {
    const startMs = Date.now();

    const conn = await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);
    conn.connection.on("disconnected", ()=>{
      console.log('db disconnected!');
    })

    let pairInstance = new Pair();
    // await pairInstance.main();

    /**
    * process1: 6810423 --> 12025547 //[v]
    * process2: 12025548 --> 17240671 //17150364
    * process3: 17240672 --> 22455796 //18981778
    * */
    let latest = await web3.eth.getBlockNumber();
    console.log(latest);
    const from = parseInt(process.argv[2]);
    const to = parseInt(process.argv[3]);
    console.log(`start from ${from} to ${to}`);

    await pairInstance.crawlPair(from, to);



    const ms = Date.now() - startMs;
    console.log(`time spent ${ms}`);

  } catch (error) {
    console.log(error);
  }
}

// main();

module.exports = Pair;