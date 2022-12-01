require("dotenv").config();
require("express-async-errors");
const express = require("express");
const PairSync = require('../data_sync/pair');

const app = express();
const pairSync = new PairSync();

const connectDB = require("../db/connect");

app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello! I'm PairService.");
})

app.get('/api/v2/pairs/:address', (req, res)=>{
  const {address} = req.params;
  const pair = pairSync.getPair(address.toLowerCase());
  if(!pair) {
    res.status(404).json({msg: `cannot find token with id ${address}`});
    return;
  }
  res.status(200).json({ pair });
})

const port = process.env.PAIR_PORT || 3001;
const start = async () => {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    await pairSync.main();

    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();