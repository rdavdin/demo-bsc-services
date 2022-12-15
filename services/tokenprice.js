require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();

const TokenPrice = require('../models/TokenPrice');

const connectDB = require("../db/connect");

app.use(express.json());

app.get('/api/v2/tkprice/:tokens', async (req, res) => {
  const tokens = req.params.tokens.split(',');
  let rs = [];
  const item = await TokenPrice.findOne({}).select('block -_id').sort({block:-1});
  const fromBlock = item.block - 864000; //in range 1 month
  for(let address of tokens){
    const tkPrice = await TokenPrice.findOne({address: address.toLowerCase(), block:{$gt: fromBlock}}).select('price -_id').sort({block:-1});
    if(tkPrice){
      rs.push({address, price: tkPrice.price});
    }
  }
  res.status(200).json(rs);
})

app.get('/api/v2/tkprice/history/:address', async (req, res) => {
  const {address} = req.params;
  const priceHistory = await TokenPrice.find({address: address.toLowerCase()}).select('block date price -_id').sort({block:-1});
  res.status(200).json({ priceHistory });
})

app.get('/api/v2/tkprice/:address/:block', async (req, res) => {
  const { address, block } = req.params;
  const price = await TokenPrice.find({address: address.toLowerCase(), block: {$lte: parseInt(block)}, block: {$gt: parseInt(block-864000)}}).sort({block:-1}).limit(1);
  if(price.length) res.status(200).json({price: price[0].price, block: price[0].block})
  else res.status(200).json({});
})

const port = process.env.TKPRICE_PORT || 3005;
const start = async () => {
  try {
    await connectDB(process.env.MONGODB_URI_SHARK);
    console.log(`db connected!`);

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}...`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();