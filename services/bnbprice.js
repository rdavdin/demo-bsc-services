require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();

const BnbPriceSync = require('../data_sync/bnbprice');
const bnbPriceSync = new BnbPriceSync();

const connectDB = require("../db/connect");

app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello! I'm Bnbprice Service.");
})

app.get('/api/v1/price/bnbprice', (req, res) => {
  const price = bnbPriceSync.getPrice();
  if(!price) {
    res.status(404).json({msg: `Cannot find bnbprice now. Pls try again later`});
    return;
  }
  res.status(200).json({ price });
})

app.get('/api/v1/price/bnbprice/:blocknumber', (req, res) => {
  const {blocknumber} = req.params;
  const price = bnbPriceSync.getPrice(blocknumber);

  if(!price) {
    res.status(404).json({msg: `Cannot find bnbprice now. Pls try again later!`});
    return;
  }
  res.status(200).json({ price });
})

const port = process.env.BNBPRICE_PORT || 3002;
const start = async () => {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    await bnbPriceSync.main();

    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();