require("dotenv").config();
const connectDB = require("../db/connect");
const SwapSync = require('../data_sync/swap');

const Web3 = require('web3');
const web3 = new Web3("https://bsc-dataseed1.ninicoin.io");
const batchSize = 500;

async function main(){
  const startMs = Date.now();

  const conn = await connectDB(process.env.MONGODB_URI);
  console.log(`db connected!`);
  conn.connection.on("disconnected", ()=>{
    console.log('db disconnected!');
  })

  
  const swapInstance = new SwapSync();
  await swapInstance.main();
  // let latest = await web3.eth.getBlockNumber();
  // await swapInstance.crawlSwap(22521034, latest);

  const ms = Date.now() - startMs;
  console.log(`Time spent ${ms}`);
}

main();