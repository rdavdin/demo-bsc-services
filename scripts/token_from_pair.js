/**
 * This script to extract base tokens from pairs to store into the token collection
 */
const fs = require('fs');

const Web3 = require("web3");
let web3 = new Web3("https://rpc.ankr.com/bsc");
// let web3 = new Web3("https://bscrpc.com");

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

const TokenModel = require("../models/Token");
const PairModel = require("../models/Pair");

require("dotenv").config();
const connectDB = require("../db/connect");

const GetErc20Abi = require("../abi/GetERC20Metadata.json");
const multiget = new web3.eth.Contract(
  GetErc20Abi,
  "0x6AC92802fa2ad602b9b9C77014B0f016CC3774DF"
);

const errors = {
  ERR_MULTI_GET: "ERR_MULTI_GET",
  ERR_STORE_TOKENS: "ERR_STORE_TOKENS",
  ERR_READ_PAIRS: "ERR_READ_PAIRS",
};

let gTokens = {};
let gInvalidTokens = {};
let totalSkip = 46150; //50270;//

function changeRpc(){
  currentUrp++;
  if(currentUrp == rpcList.length) currentUrp = 0;
  web3 = new Web3(rpcList[currentUrp]);
}

async function warmup() {
  try {
    const tokens = await TokenModel.find({});
    tokens.forEach((token) => {
      updateState(token);
    });
    console.log("warmup finished!");
  } catch (error) {
    console.log("warmup tokens error ", error);
  }
}

function updateState(token) {
  if (!gTokens[token.address]) gTokens[token.address] = true;
}

async function processData() {
  try {
    const step = 1000;
    let skip = totalSkip;
    let pairs = [];

    pairs = await PairModel.find({})
      .sort({ blockNumber: 1 })
      .select("base")
      .limit(step)
      .skip(skip);

    let newTokens = [];
    for (let i = 0; i < pairs.length; i++) {
      if (!newTokens.find((t) => t == pairs[i].base))
        newTokens.push(pairs[i].base);
    }
    await addTokens(newTokens);
    skip += step;
    totalSkip = skip;
  } catch (error) {
    if (error.message == errors.ERR_MULTI_GET) {
      throw error;
      // console.log("change rpcUrl for web3 ", errors.ERR_MULTI_GET);
      // changeRpc();
    } else {
      console.log("error processData: ", error);
      throw new Error(errors.ERR_READ_PAIRS);
    }
  }

  setTimeout(async () => {
    console.log(totalSkip);
    await processData();
  }, 3000);
}

async function addTokens(addresses) {
  addresses = addresses.filter((t) => !gTokens[t] && !gInvalidTokens[t]);
  if (addresses.length == 0) return;

  try {
    let tokens = [];
    const rs = await multiget.methods.getMulti(addresses).call();
    for (let i = 0; i < addresses.length; i++) {
      //ignore tokens not supporting symbol/name/decimals
      if (!rs.symbols[i] || !rs.names[i] || !rs.decimals[i]) continue;
      const newToken = {
        address: addresses[i],
        symbol: rs.symbols[i],
        decimals: rs.decimals[i],
        name: rs.names[i],
      };
      tokens.push(newToken);
      updateState(newToken);
    }
    await storeTokens(tokens);
  } catch (error) {
    if (error.message == errors.ERR_STORE_TOKENS) {
      //throw error;
      await addTokens(addresses);
      console.log("error insert batch of tokens re-storeToken successfully");
    } else {
      console.log(`error multiget tokens`);
      for(let i = 0; i < addresses.length; i++){
        await processErrorMultiget(addresses[i]);
      }
    }
  }
}

async function processErrorMultiget(address){
  try {
    await multiget.methods.getMulti([address]).call();
  } catch (error) {
    gInvalidTokens[address] = true;
  }
}

async function storeTokens(tokens) {
  if (tokens.length == 0) return;
  try {
    await TokenModel.insertMany(tokens, { ordered: false });
  } catch (error) {
    console.log("error insert batch of tokens ", error);
    throw new Error(errors.ERR_STORE_TOKENS);
  }
}

async function main() {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI_ADEX);
    console.log(`db connected!`);

    await warmup();
    await processData();

    const ms = Date.now() - startMs;
    console.log(`time spent ${ms}`);
  } catch (error) {
    console.log(error.message);
    console.log(error);
    process.exit(1);
  }
}

main();