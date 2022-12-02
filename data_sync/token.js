const fs = require('fs')
const LineByLine = require('line-by-line');
const TokenModel = require("../models/Token");

const Web3 = require("web3");
const web3 = new Web3("https://rpc.ankr.com/bsc");
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io");

const GetErc20Abi = require('../abi/GetERC20Metadata.json');
const multiget = new web3.eth.Contract(GetErc20Abi, '0x6AC92802fa2ad602b9b9C77014B0f016CC3774DF');

const filePath = './db/token/invalid.log';
const writeStream = fs.createWriteStream(filePath, {flags: 'a'});

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const write = (data) => new Promise((res, rej) => {
  writeStream.write(data, (err)=>{
    if(err) rej(err);
    res();
  })
})
class Token {
  constructor() {
    this.invalidTokens = {};
  }

  async warmup() {
    const startMs = Date.now();
    
    const lr = new LineByLine(filePath);
    lr.on('line', (line)=>{
      this.invalidTokens[line] = true;
    });
    
    return new Promise((res, rej)=>{
      lr.on('end', ()=>{
        console.log(`Token: warmup done! - ${Date.now() - startMs} ms`);
        res();
      });
      lr.on('error', err => rej(err));
    })
  }

  async getToken(address) {
    address = address.toLowerCase();
    const token = await TokenModel.findOne({address: address}).select('address symbol name decimals -_id');
    return token;
  }

  async getTokens(addresses) {
    addresses = addresses.map((a) => a.toLowerCase());
    const tokens = await TokenModel.find({address: {$in: addresses}}).select('address symbol name decimals -_id');
    return tokens
  }

  async addTokens(addresses){
    addresses = addresses.map((a) => a.toLowerCase());
    addresses = addresses.filter((a) => !this.invalidTokens[a]);
    const tokens = await TokenModel.find({address: {$in: addresses}}).select('address -_id');
    if(tokens.length){
      const mapTokens = tokens.map((a) => a.address);
      addresses = addresses.filter((a) => !mapTokens.includes(a));
    }
    let fAddresses = [];
    for(let i = 0; i < addresses.length; i++){
      if(!fAddresses.find((a) => a == addresses[i])){
        fAddresses.push(addresses[i]);
      }
    }
    if(!fAddresses.length) return;
    try {
      const rs = await multiget.methods.getMulti(fAddresses).call();
      await this.storeTokens(rs, fAddresses);
    } catch (error) {
      await this.processErrorBatch(fAddresses);
    }
  }
  
  async processErrorBatch(addresses){
    for(let i = 0; i < addresses.length; i++){
      const address = addresses[i];
      try {
        const rs = await multiget.methods.getMulti([address]).call();
        await this.storeTokens(rs, [address]);
      } catch (error) {
        await this.updateInvalidToken(address);
      }
    }
  }
  
  async storeTokens(rs, addresses){
    let tokensInfo = [];
    for (let i = 0; i < addresses.length; i++) {
      //ignore tokens not supporting symbol/name/decimals
      if (!rs.symbols[i] || !rs.names[i] || !rs.decimals[i]) {
        await this.updateInvalidToken(addresses[i]);
        continue;
      }
      const newToken = {
        address: addresses[i],
        symbol: rs.symbols[i],
        decimals: rs.decimals[i],
        name: rs.names[i],
      };
      tokensInfo.push(newToken);
    }
    if(!tokensInfo.length) return;
    try {
      await TokenModel.insertMany(tokensInfo, { ordered: false });
    } catch (error) {
      if(error.code === 11000){
        console.log(`Ignore duplicate error`);
      }else{
        console.log(`Error insertMany ${error}`);
        console.log(`the inserted batch: `);
        console.log({tokensInfo});
      }
    }
  }
  
  async updateInvalidToken(address){
    this.invalidTokens[address] = true;
    await write(`${address}\n`);
  }

  async main(){
    await this.warmup();
  }
}

module.exports = Token;
