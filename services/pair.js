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

app.get('/api/v1/pairs/:address', (req, res)=>{
  const {address} = req.params;
  res.json(pairSync.getPair(address.toLowerCase()));
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