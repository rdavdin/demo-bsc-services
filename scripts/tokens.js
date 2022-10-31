/**
 * extract base tokens from pairs
 * get token info (name, symbol, decimals) from node
 * then store into db
 */
const fs = require('fs')
const LineByLine = require('line-by-line');
const Web3 = require('web3');
let web3 = new Web3("https://rpc.ankr.com/bsc");

const TokenModel = require('../models/Token');
const PairModel = require('../models/Pair');

const GetErc20Abi = require("../abi/GetERC20Metadata.json");
const multiget = new web3.eth.Contract(
  GetErc20Abi,
  "0x6AC92802fa2ad602b9b9C77014B0f016CC3774DF"
);

const filePath = './db/token/invalid.log';
const writeStream = fs.createWriteStream(filePath, {flags: 'a'});

let gTokens = {};
let gInvalidTokens = {};
let gTotalSkip = 0;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const write = (data) => new Promise((res, rej) => {
  console.log(`$inside writing... `);
  writeStream.write(data, (err)=>{
    if(err) rej(err);
    res();
  })
})

async function warmup(){
  const startMs = Date.now();
  const tokens = await TokenModel.find({});
  tokens.forEach((token) => {
    gTokens[token.address] = true;
  });
  const lr = new LineByLine(filePath);
  lr.on('line', (line)=>{
    //console.log(line);
    gInvalidTokens[line] = true;
  });
  
  return new Promise((res, rej)=>{
    lr.on('end', ()=>{
      console.log(`warmup done! - ${Date.now() - startMs} ms`);
      res();
    });
    lr.on('error', err => rej(err));
  })
}

async function start(){
  const startMs = Date.now();
  const totalDocs = await PairModel.estimatedDocumentCount();
  const step = 500;
  do {
    console.log(`from ${gTotalSkip} to ${gTotalSkip + step}`);
    const addresses = await getBatch(step, gTotalSkip);
    await processBatch(addresses);
    gTotalSkip += step;
  } while (gTotalSkip < totalDocs);
  console.log(`The loop end - ${Date.now() - startMs} ms`);
}

async function getBatch(step, skip){
  const pairs = await PairModel.find({})
      .sort({ blockNumber: 1 })
      .select("base")
      .limit(step)
      .skip(skip);
  
  let addresses = [];
  pairs.forEach(p => {
    if(!addresses.find((t) => t == p.base)) addresses.push(p.base);
  })
  return addresses;
}

async function processBatch(addresses){
  addresses = addresses.filter((t) => !gTokens[t] && !gInvalidTokens[t]);
  if(!addresses.length) return;

  try {
    const rs = await multiget.methods.getMulti(addresses).call();
    await storeTokens(rs, addresses);
  } catch (error) {
    await processErrorBatch(addresses);
  }
}

async function processErrorBatch(addresses){
  for(let i = 0; i < addresses.length; i++){
    const address = addresses[i];
    try {
      const rs = await multiget.methods.getMulti([address]).call();
      await storeTokens(rs, [address]);
    } catch (error) {
      await updateInvalidToken(address);
    }
  }
}

async function storeTokens(rs, addresses){
  let tokensInfo = [];
  for (let i = 0; i < addresses.length; i++) {
    //ignore tokens not supporting symbol/name/decimals
    if (!rs.symbols[i] || !rs.names[i] || !rs.decimals[i]) {
      await updateInvalidToken(addresses[i]);
      continue;
    }
    const newToken = {
      address: addresses[i],
      symbol: rs.symbols[i],
      decimals: rs.decimals[i],
      name: rs.names[i],
    };
    tokensInfo.push(newToken);
    gTokens[newToken.address] = true;
  }

  if(!tokensInfo.length) return;
  
  try {
    await TokenModel.insertMany(tokensInfo, { ordered: false });
  } catch (error) {
    if(error.code === 11000){ //ignore duplicate
      console.log(`Ignore duplicate error`);
    }else{
      console.log(`Error insertMany ${error}`);
      await sleep(3000);
      await TokenModel.insertMany(tokensInfo, {ordered: false});
      console.log('insertMany again after 3s successfully');
    }
  }
}

async function updateInvalidToken(address){
  gInvalidTokens[address] = true;
  await write(`${address}\n`);
}

require("dotenv").config();
const connectDB = require("../db/connect");
async function main(){
  const startMs = Date.now();
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    await warmup();
    await start();

    console.log(`The end after ${Date.now() - startMs}  ms`);
  } catch (error) {
    console.log(error);
  }
}
main();