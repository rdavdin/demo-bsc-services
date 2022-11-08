const { isQuote, getQuoteName, isWBNB } = require('./bsc');
const {getNumber, getPrice} = require('../utils/format');
const axios = require('axios');
const SwapModel = require('../models/Swap');
const Web3 = require('web3');
let web3 = new Web3("https://bsc-dataseed1.ninicoin.io");

const rpcList = [
  "https://bsc-dataseed1.ninicoin.io",
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



const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const PAIR_API_URL = `${process.env.HOST}:${process.env.PAIR_PORT}/api/v1/pairs`;//"http://localhost:3001/api/v1/pairs";
const BNB_PRICE_URL = `${process.env.HOST}:${process.env.BNBPRICE_PORT}/api/v1/price`;
const TOKEN_API_URL = `${process.env.HOST}:${process.env.TOKEN_PORT}/api/v1/token`;
const STARTING_BLOCK = 22453433;
const batchSize = 200;

const toBN = web3.utils.toBN;
const GET_LOG_ERROR = 'GET_LOG_ERROR';
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * return: 1 token0 = n token1? e.g: 1 token0 per 0.24343 token1
 * @param {string} amount0
 * @param {string} amount1
 * @param {Number} decimal0
 * @param {Number} decimal1
 */
 const calPrice = (amount0, amount1, decimal0 = 18, decimal1 = 18) =>{
  if(toBN(amount0).isZero()) return 0;
  const f = 8;
  const n = (amount0.length + f) < amount1.length ? 0 : amount0.length + f - amount1.length;

  const n1p0 = parseInt(toBN(amount1).mul(toBN('1'.padEnd(n+1,'0'))).div(toBN(amount0)))/Math.pow(10, n);
  return getPrice(n1p0, decimal0, decimal1);
}
class Swap {
  constructor(){
    this.crawledBlock = STARTING_BLOCK;
  }

  /**
   * get n last transactions of a particular token
   * @returns {priceUSD, amount, total, isBuy}
   */
  async getLastTs(token, n = 20){
    try {
      const address = token.toLowerCase();
      let tokenInfo = await this.getToken(address);
      if(!tokenInfo) return {status: 404, msg: `cannot get info of token ${address}`};
      tokenInfo.address = address;

      let swaps = [];
      if(!isQuote(address)){
        swaps = await SwapModel.find({base: address}).select('priceUSD baseAmount quoteAmount isBuy _id').sort({blockNumber: -1}).limit(n);
        return await this.calTsInfo(tokenInfo, swaps);
      }else{
        //const startMs = Date.now();
        console.time(`time query token ${address}`);
        swaps = await SwapModel.find({$or: [{quote: address}, {base: address}]}).select('priceUSD baseAmount quoteAmount isBuy base _id').sort({blockNumber: -1}).limit(n);
        //console.log(`time query token ${address} - ${Date.now() - startMs}`);
        console.timeEnd(`time query token ${address}`);
        return await this.calTsInfo(tokenInfo, swaps, false);
      }
    } catch (error) {
      return {status: 400, msg: error.message};
    }
  }

  async calTsInfo(tokenInfo, swaps, sureBase = true){
    let rs = [];
    for(let i = 0; i < swaps.length; i++){
      const swap = swaps[i];
      if(swap.priceUSD == '0') continue;
      // console.log(swap);
      
      if(!sureBase && (tokenInfo.address != swap.base)){
        swap.isBuy = !swap.isBuy;
        swap.amount = getNumber(swap.quoteAmount, 8);
        const baseInfo = await this.getToken(swap.base);
        if(!baseInfo) continue; //ignore and continue with others
        let price = calPrice(swap.quoteAmount, swap.baseAmount, tokenInfo.decimals, baseInfo.decimals);
        swap.priceUSD = price*swap.priceUSD;
      }else{
        swap.amount = getNumber(swap.baseAmount, 8, tokenInfo.decimals);
      }
      rs.push({priceUSD: swap.priceUSD, amount: swap.amount, isBuy: swap.isBuy})
    }

    return rs;
  }

  async warmup(){
    const d = await SwapModel.findOne({}).sort({blockNumber: -1});
    if(d) {
      console.log(`warmup: from block ${d.blockNumber}`);
      this.crawledBlock = d.blockNumber;
    }
  }

  async getPair(address){
    try {
      const res = await axios.get(`${PAIR_API_URL}/${address}`);
      if(res.status != 200) return undefined;
      return res.data.pair;
    } catch (error) {
      //console.log(error.code, error.message);
      return undefined;
    }
  }

  async getToken(address){
    try {
      const res = await axios.get(`${TOKEN_API_URL}/${address}`);
      if(res.status != 200) return undefined;
      return res.data.token;
    } catch (error) {
      //console.log(error.code, error.message);
      return undefined;
    }
  }

  async getBnbPrice(blockNumber){
    try {
      const res = await axios.get(`${BNB_PRICE_URL}/bnbprice/${blockNumber}`);
      if(res.status != 200) return undefined;
      return parseInt(res.data.price);
    } catch (error) {
      //console.log(error.code, error.message);
      return undefined;
    }
  }

  async syncSwaps(toBlock){
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
    let swapLogs = [];
    try {
      swapLogs = await web3.eth.getPastLogs(options);
    } catch (error) {
      error.msg = GET_LOG_ERROR;
      throw error;
    }
    let swapBatch = [];
    for(let i = 0; i < swapLogs.length; i++){
      const log = swapLogs[i];
      const aPair = await this.getPair(log.address);
      if(!aPair) continue;
      const aBase = await this.getToken(aPair.base);
      if(!aBase) continue;

      let bnbPrice = 1;
      if(isWBNB(aPair.quote)){
        const price = await this.getBnbPrice(log.blockNumber);
        if(!price) continue;
        bnbPrice = price;
      }
      const obj = this.createSwapObj(aPair, aBase, log, bnbPrice);
      if(obj) swapBatch.push(obj);
    }
    //console.log(swapBatch);
    await this.storeDb(swapBatch);

    this.crawledBlock = toBlock;
    console.log(`Swap: crawledBlock updated: ${this.crawledBlock}`);
  }

  async storeDb(swapBatch) {
    if (!swapBatch.length) return;
    try {
      await SwapModel.insertMany(swapBatch, { ordered: false });
    } catch (error) {
      if(error.code === 11000){ //ignore duplicate
        console.log(`Ignore duplicate error`);
      }else{
        console.log(`Error insertMany ${error}`);
        await sleep(3000);
        await this.storeDb(swapBatch);
        console.log('storeDb again after 3s successfully');
      }
    }
  }

  createSwapObj(aPair, aBase, log, mulPrice = 1){
    const amounts = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], log.data);
    const {'0': in0, '1': in1, '2': out0, '3': out1} = {...amounts};
    if(in0 == '0' && in1 == '0') return undefined;
    //this case should check? https://ethereum.stackexchange.com/questions/99553/how-to-understand-the-swap-event-payload
    if(in0 != '0' && in1 != '0') return undefined;

    let obj = {
      pair: aPair.pair,
      base: aPair.base,
      quote: aPair.quote,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash
    };
    aPair.baseIs0 = aPair.base.toLowerCase() < aPair.quote.toLowerCase() ? true : false;
    if(aPair.baseIs0){
      if(in0 == '0'){
        obj.isBuy = true;
        obj.baseAmount = out0;
        obj.quoteAmount = in1;
      }else{
        obj.isBuy = false;
        obj.baseAmount = in0;
        obj.quoteAmount = out1;
      }
    }else{
      if(in1 == '0'){
        obj.isBuy = true;
        obj.baseAmount = out1;
        obj.quoteAmount = in0;
      }else{
        obj.isBuy = false;
        obj.baseAmount = in1;
        obj.quoteAmount = out0;
      }
    }

    //TODO: check this tx: 0x03dedd3dc45e025ae55cadaaa2d453c896c115252d68a1f8e1a93591640fcb4a ?
    if(obj.baseAmount == '0') return undefined;
    
    let price = calPrice(obj.baseAmount, obj.quoteAmount, aBase.decimals);
    obj.priceUSD = price*mulPrice;
    return obj;
  }

  async crawlSwap(fromBlock, toBlock, batchSize = 20){
    try {
      this.crawledBlock = fromBlock - 1;
      const latest = toBlock ? toBlock : await web3.eth.getBlockNumber();
      let to = fromBlock + batchSize;
      while (to < latest) {
        await this.syncSwaps(to);
        to += batchSize;
      }
      await this.syncSwaps(latest);
      console.log(`crawlSwap done: fromBlock ${fromBlock}, toBlock ${latest}`);
    } catch (error) {
      console.log(error);
      rpcMs = Date.now() - rpcMs;
      if(rpcMs < 30000){
        await sleep(30000 - rpcMs);
      }
      changeRpc();
      await this.crawlSwap(this.crawledBlock + 1, toBlock, batchSize);
    }
  }

  async main() {
    await this.warmup();
    rpcMs = Date.now();
    let isLoop = false;
    let latest = await web3.eth.getBlockNumber();
    do {
      const fromBlock = this.crawledBlock + 1;
      await this.crawlSwap(fromBlock, latest, batchSize);
      latest = await web3.eth.getBlockNumber();
      isLoop = (latest - this.crawledBlock) > batchSize ? true : false;
    } while (isLoop);

    console.log(`Swap: data synced to block latest ${latest}`);
    setInterval(async () => {
      latest = await web3.eth.getBlockNumber();
      await this.syncSwaps(latest);
    }, 30000);
  }
}

module.exports = Swap;