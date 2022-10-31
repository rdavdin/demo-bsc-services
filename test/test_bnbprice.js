require("dotenv").config();
const connectDB = require("../db/connect");
const BNBPrice = require('../data_sync/bnbprice');

// const Web3 = require("web3");
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io");
// const batchSize = 10;

async function main(){
  const startMs = Date.now();

  const conn = await connectDB(process.env.MONGODB_URI_TEST);
  console.log(`db connected!`);
  conn.connection.on("disconnected", ()=>{
    console.log('db disconnected!');
  })

  let bnbPrice = new BNBPrice();
  await bnbPrice.main();

  // const latest = await web3.eth.getBlockNumber();
  // const fromBlock = latest - 1000;
  // console.log(`crawl fromBlock ${fromBlock} latest ${latest}`);
  // await bnbPrice.crawlWbnbBusd(fromBlock, latest, batchSize);

  const ms = Date.now() - startMs;
  console.log(`Time spent ${ms}`);
}

main();