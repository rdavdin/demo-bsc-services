require('dotenv').config();
const LineByLine = require('line-by-line');
const { getPriceHistory } = require('./bitquery');

const TokenPrice = require('../models/TokenPrice');
const filePath = './db/token/template';

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
    const priceHistory = await getPriceHistory(tokenAddr, BUSD);
    
    priceHistory.forEach((item => {
      TokenPrice.create({address: tokenAddr, blockNumber: item.block, priceUSD: item.price, date: item.date }, (err)=>{
        if(err) console.log(`Error create a document TokenPrice: ${err.code}`);
      });
    }))
  }
}

const connectDB = require("../db/connect");
async function main(){
  const conn = await connectDB(process.env.MONGODB_URI);
  console.log(`db connected!`);
  await loadTkAddresses();
  await storePriceHistory();
}

main();