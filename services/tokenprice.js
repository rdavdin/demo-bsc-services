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
  for(let address of tokens){
    const tkPrice = await TokenPrice.findOne({address: address.toLowerCase()}).select('priceUSD -_id').sort({blockNumber:-1});
    if(tkPrice){
      rs.push({address, priceUSD: tkPrice.priceUSD});
    }
  }
  res.status(200).json(rs);
})

app.get('/api/v2/tkprice/history/:address', async (req, res) => {
  const {address} = req.params;
  const priceHistory = await TokenPrice.find({address: address.toLowerCase()}).select('blockNumber date priceUSD -_id').sort({blockNumber:-1});
  res.status(200).json({ priceHistory });
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