require('dotenv').config();
const LineByLine = require('line-by-line');
const { getPriceHistory } = require('./bitquery');
const TokenPrice = require('../models/TokenPrice');
const filePath = './db/token/tkaddress';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

let addresses = [];
const loadTkAddresses = async () => {
  const lr = new LineByLine(filePath);
  lr.on('line', (line)=>{
    addresses.push(line);
  });
  
  return new Promise((res, rej)=>{
    lr.on('end', ()=>{
      res();
    });
    lr.on('error', err => rej(err));
  })
}

async function storePriceHistory(){
  const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  for(let i = 0; i < addresses.length; i++){
    const tokenAddr = addresses[i].toLowerCase();
    let priceHistory = [];
    try {
      priceHistory = await getPriceHistory(tokenAddr, BUSD);
    } catch (error) {
      await sleep(90000);
      i--;
      continue;
    }
    
    priceHistory.forEach((item => {
      TokenPrice.create({address: tokenAddr, block: item.block, price: item.price, date: item.date }, (err)=>{
        if(err) console.log(`Error create a document TokenPrice: ${err.code}`);
        if(priceHistory[priceHistory.length - 1] === item){
          console.log(`Done token ${tokenAddr}`);
        }
      });
    }))
  }
}

const connectDB = require("../db/connect");
async function main(){
  const conn = await connectDB(process.env.MONGODB_URI_SHARK);
  console.log(`db connected!`);
  await loadTkAddresses();
  await storePriceHistory();
  console.log("Done!");
}

main();