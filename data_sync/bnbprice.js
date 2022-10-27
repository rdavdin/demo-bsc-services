const Web3 = require('web3');
const WbnbBusdModel = require('../models/Wbnb');
const WBNB_BUSD = "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16";
const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

// const web3 = new Web3("https://rpc.ankr.com/bsc");
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io"); //for process2
const web3 = new Web3("https://bscrpc.com");

const PancakePairABI = require('../abi/PancakePair.json');
const batchSize = 2000;
const toBN = web3.utils.toBN;

class BNBPrice {
  constructor(){
    this.crawledBlock = -1;
    this.trackedMinBlock = Number.MAX_VALUE;
    this.wbnbBusd = {};
  }

  getPrice(blockNumber = 'latest'){
    if(blockNumber == 'latest') {
      blockNumber = this.crawledBlock;
    };

    do {
      if(this.wbnbBusd[blockNumber]) return {price: this.wbnbBusd[blockNumber]};
      blockNumber--;
    } while (this.trackedMinBlock < blockNumber);

    //in case not found return latest
    //FIXME: should get data from db
    return this.getPrice();
  }

  calPrice(amounts){
    if(amounts[0] == '0' && amounts[1] == '0') return undefined;
    let bnbQ, busdQ;
    if(amounts[0] == '0'){
      bnbQ = toBN(amounts[2]);
      busdQ = toBN(amounts[1]);
    }else{
      bnbQ = toBN(amounts[0]);
      busdQ = toBN(amounts[3]);
    }
    if(bnbQ.isZero() || busdQ.isZero()) return undefined;
    return parseInt(busdQ.mul(toBN('100000000')).div(bnbQ))/(10**8);
  }

  async warmup(){
    const docs = await WbnbBusdModel.find({}).sort('blockNumber');
    if(docs.length > 0) this.trackedMinBlock = docs[0].blockNumber;
    docs.forEach(d => {
      if(this.crawledBlock < d.blockNumber) this.crawledBlock = d.blockNumber;
      this.wbnbBusd[d.blockNumber] = d.price;
    });
    console.log(`this.crawedBlock after warmup: this.crawledBlock ${this.crawledBlock}, this.trackedMinBlock ${this.trackedMinBlock}`); 
  }

  async syncWbnbBusd(toBlock){
    try {
      if(toBlock <= this.crawledBlock) return;
      const fromBlock = this.crawledBlock + 1;

      const options = {
        fromBlock,
        toBlock,
        address: WBNB_BUSD,
        topics: [
          SWAP_TOPIC
        ],
      };
      let logs = await web3.eth.getPastLogs(options);
      console.log(`logs.length ${logs.length}`);

      let syncedBlock = fromBlock - 1;
      logs.forEach(async (log) => {
        if(syncedBlock == log.blockNumber) return;
        const amounts = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], log.data);
        const price = this.calPrice(amounts);
        if(price){
          syncedBlock = log.blockNumber;
          await WbnbBusdModel.create({
            blockNumber: log.blockNumber, 
            price: price
          });
          this.wbnbBusd[log.blockNumber] = price;
          if(this.trackedMinBlock > log.blockNumber) this.trackedMinBlock = log.blockNumber;
        }
      });

      this.crawledBlock = toBlock;
      console.log(`this.crawledBlock updated ${this.crawledBlock}`);
    } catch (error) {
      throw new Error('Error: syncWbnbBusd abc');
    }
  }

  async crawlWbnbBusd(fromBlock, toBlock, batchSize = 10000){
    try {
      this.crawledBlock = fromBlock - 1;
      const latest = toBlock ? toBlock : await web3.eth.getBlockNumber();
      let to = fromBlock + batchSize;

      while(to < latest){
        await this.syncWbnbBusd(to);
        to += batchSize;
      }
      await this.syncWbnbBusd(latest);

      console.log(`crawlWbnbBusd done: fromBlock ${fromBlock}, toBlock ${latest}`);
    } catch (error) {
      console.log(`error from crawlWbnbBusd \n`);
      console.log(error);
      setTimeout(() => {
        this.crawlWbnbBusd(this.crawledBlock + 1, toBlock, batchSize);
      }, 30000);
    }
  }

  async main(){
    await this.warmup();
    let latest = await web3.eth.getBlockNumber();
    const fromBlock = this.crawledBlock + 1;
    await this.crawlWbnbBusd(fromBlock, latest, 1000);

    setInterval(async () => {
      latest = await web3.eth.getBlockNumber();
      await this.syncWbnbBusd(latest);
    }, 3000);
  }
}


require("dotenv").config();
const connectDB = require("../db/connect");

async function main(){
  const startMs = Date.now();

  const conn = await connectDB(process.env.MONGODB_URI);
  console.log(`db connected!`);
  conn.connection.on("disconnected", ()=>{
    console.log('db disconnected!');
  })

  let bnbPrice = new BNBPrice();
  // await bnbPrice.main();

  const latest = await web3.eth.getBlockNumber();
  const fromBlock = latest - 1000000;
  console.log(`crawl 1 million blocks back fromBlock ${fromBlock} latest ${latest}`);
  // await bnbPrice.warmup();
  await bnbPrice.crawlWbnbBusd(fromBlock, latest, batchSize);

  const ms = Date.now() - startMs;
  console.log(`Time spent ${ms}`);
}

// main();
module.exports = BNBPrice;