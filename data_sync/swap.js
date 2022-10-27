const { isQuote, getQuoteName, isWBNB } = require('./utils');
const {getNumber, getPrice} = require('../utils/format');
const axios = require('axios');
const SwapModel = require('../models/Swap');
const TokenModel = require('../models/Token');
const Web3 = require('web3');
const web3 = new Web3("https://bsc-dataseed1.ninicoin.io"); //for process2

const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const GetErc20Abi = require('../abi/GetERC20Metadata.json');
const multiget = new web3.eth.Contract(GetErc20Abi, '0x6AC92802fa2ad602b9b9C77014B0f016CC3774DF');


const PAIR_API_URL = "http://localhost:3001/api/v1/pairs";
const BNB_PRICE_URL = "http://localhost:3002/api/v1/price";


const batchSize = 500;
const toBN = web3.utils.toBN;

class Swap {
  constructor(){
    this.crawledBlock = -1;
  }

  /**
   * get n last transactions of a particular token
   * @returns {price, amount, total}
   */
  getLastTs(token, n){
    return {};
  }

  async warmup(fromBlock){
    //TODO: just temporary to test
    this.crawledBlock = fromBlock;
  }

  async getPair(pair){
    const res = await axios.get(`${PAIR_API_URL}/${pair}`);
    if(res.status != 200) return undefined;
    return res.data;
  }

  async syncSwaps(toBlock){
    try {
      if(toBlock <= this.crawledBlock) return;
      const fromBlock = this.crawledBlock + 1;

      const options = {
        fromBlock,
        toBlock,
        topics: [
          SWAP_TOPIC
        ]
      };

      console.log(`fromBlock: ${fromBlock}, toBlock: ${toBlock}`);
      const pairLogs = await web3.eth.getPastLogs(options);
      

      pairLogs.forEach(async (log) => {
        const aPair = await this.getPair(log.address);
        if(!aPair) return;
        await this.checkAndStore(aPair, log);
      });

    } catch (error) {
      throw new Error('syncSwaps abc');
    }
  }

  async checkAndStore(aPair, log){
    const amounts = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], log.data);

    if(amounts[0] == '0' && amounts[1] == '0') return undefined;
    //this case should check? https://ethereum.stackexchange.com/questions/99553/how-to-understand-the-swap-event-payload
    if(amounts[0] != '0' && amounts[1] != '0') return undefined;  

    let obj = {
      pair: aPair.pair,
      base: aPair.base,
      quote: aPair.quote,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash
    };

    aPair.baseIs0 = aPair.base.toLowerCase() < aPair.quote.toLowerCase() ? true : false;

    if(aPair.baseIs0){
      if(amounts[0] == '0'){
        obj.isBuy = true;
        obj.baseAmount = amounts[2];
        obj.quoteAmount = amounts[1];
      }else{
        obj.isBuy = false;
        obj.baseAmount = amounts[0];
        obj.quoteAmount = amounts[3];
      }
    }else{
      if(amounts[1] == '0'){
        obj.isBuy = true;
        obj.baseAmount = amounts[3];
        obj.quoteAmount = amounts[0];
      }else{
        obj.isBuy = false;
        obj.baseAmount = amounts[1];
        obj.quoteAmount = amounts[2];
      }
    }
    
    //FIXME: basically this is not a place to find or store TokenModel
    //We have to store tokens from process of crawling pairs.
    //Here is just to read and use data from TokenModel 
    let baseToken = await TokenModel.findOne({address: obj.base});

    if(!baseToken){
      const rs = await multiget.methods.getMulti([obj.base]).call();
      baseToken = {
        address : obj.base,
        symbol :  rs.symbols[0],
        decimals: rs.decimals[0],
        name : rs.names[0]
      }
      await TokenModel.create(baseToken, (err, t) => {
        if(err) {
          console.log(`Cannot create token ${baseToken}`);
          console.log(err);
        }
      }) 
    }

    let bnbPrice = 1;
    if(isWBNB(obj.quote)){
      try {
        const res = await axios.get(`${BNB_PRICE_URL}/bnbprice/${obj.blockNumber}`);
        if(res.status != 200) return undefined;
        bnbPrice = parseInt(res.data.price);
      } catch (error) {
        throw new Error('Cannot get bnbprice');
      }
    }
    let price = parseInt(toBN(obj.quoteAmount).mul(toBN('100000000')).div(toBN(obj.baseAmount)))/(10**8);
    price = getPrice(price, baseToken.decimals);

    obj.priceUSD = price*bnbPrice;
    console.log(obj);
    
    console.log('\n');
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

  let latest = await web3.eth.getBlockNumber();
  console.log(latest);

  const swapInstance = new Swap();
  swapInstance.warmup(latest - 1);
  swapInstance.syncSwaps(latest);

  const ms = Date.now() - startMs;
  console.log(`time spent ${ms}`);
}

main();