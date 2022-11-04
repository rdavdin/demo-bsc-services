const Web3 = require('web3');
const WbnbBusdModel = require('../models/Wbnb');
const WBNB_BUSD = "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16";
const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

// const web3 = new Web3("https://rpc.ankr.com/bsc");
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io"); //for process2
const web3 = new Web3("https://bscrpc.com");

const PancakePairABI = require('../abi/PancakePair.json');
const batchSize = 1000;
const toBN = web3.utils.toBN;

const GET_LOG_ERROR = 'GET_LOG_ERROR';
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const STARTING_BLOCK = 21450127;  //just crawl from this block

class BNBPrice {
  constructor(){
    this.crawledBlock = STARTING_BLOCK - 1;
    this.trackedMinBlock = Number.MAX_VALUE;
    this.wbnbBusd = {};
  }

  getPrice(blockNumber = 'latest'){
    if(blockNumber == 'latest') {
      blockNumber = this.crawledBlock;
    };

    do {
      if(this.wbnbBusd[blockNumber]) return this.wbnbBusd[blockNumber];
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
    const startMs = Date.now();

    const totalDocs = await WbnbBusdModel.estimatedDocumentCount();
    let totalSkip = 0;
    const step = 100000;

    do {
      console.log('totalSkip ', totalSkip);
      const docs = await WbnbBusdModel.find({}).sort('blockNumber').limit(step).skip(totalSkip);
      if(docs.length > 0) this.trackedMinBlock = docs[0].blockNumber;
      docs.forEach(d => {
        if(this.crawledBlock < d.blockNumber) this.crawledBlock = d.blockNumber;
        this.wbnbBusd[d.blockNumber] = d.price;
      });
      totalSkip += step;
    } while (totalSkip < totalDocs);

    console.log(`crawledBlock ${this.crawledBlock}, trackedMinBlock ${this.trackedMinBlock}`);
    console.log(`warmup done! - ${Date.now() - startMs}`); 
  }

  async syncWbnbBusd(toBlock){
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
    let logs = [];
    try {
      logs = await web3.eth.getPastLogs(options);
    } catch (error) {
      error.msg = GET_LOG_ERROR;
      throw error;
    }
    console.log(`logs.length ${logs.length}`);

    let syncedBlock = fromBlock - 1;
    for(let i = 0; i < logs.length; i++){
      const log = logs[i];
      if(syncedBlock == log.blockNumber) continue;

      const amounts = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], log.data);
      const price = this.calPrice(amounts);
      if(price){
        //TODO: consider collect a batch then insertMany ?
        WbnbBusdModel.create({blockNumber: log.blockNumber, price: price}, (err)=>{
          if(err) console.log(`Error create a document BnbBusd: ${err.code}`);
        });
        syncedBlock = log.blockNumber;
        this.wbnbBusd[log.blockNumber] = price;
        if(this.trackedMinBlock > log.blockNumber) this.trackedMinBlock = log.blockNumber;
      }
    }
    
    this.crawledBlock = toBlock;
    console.log(`Bnbprice: crawledBlock updated: ${this.crawledBlock}`);
  }
  
  async crawlWbnbBusd(fromBlock, toBlock, batchSize = 1000){
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
      console.log(error);
      await sleep(30000);
      await this.crawlWbnbBusd(this.crawledBlock + 1, toBlock, batchSize);
    }
  }

  async main(){
    await this.warmup();
    let latest = await web3.eth.getBlockNumber();
    const fromBlock = this.crawledBlock + 1;
    await this.crawlWbnbBusd(fromBlock, latest, batchSize);

    console.log(`BNBPrice: data synced to block latest ${latest}`);
    setInterval(async () => {
      latest = await web3.eth.getBlockNumber();
      await this.syncWbnbBusd(latest);
    }, 3000);
  }
}

module.exports = BNBPrice;