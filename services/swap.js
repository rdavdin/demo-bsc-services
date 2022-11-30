require("dotenv").config();
require("express-async-errors");
const express = require("express");
const {Swap : SwapSync, TRY_BM} = require('../data_sync/swap');

const app = express();
const swapSync = new SwapSync();

const connectDB = require("../db/connect");

app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello! I'm Swap Service.");
})

app.get('/api/v1/swap/tx/:address/:n', async (req, res)=>{
  const token = req.params.address;
  const n = req.params.n;
  const docs = await swapSync.getLastTs(token, n);

  if(docs.msg){
    res.status(400).json({msg: docs.msg});
  }else{
    res.status(200).json({ txs: docs });
  }
})

app.get('/api/v1/swap/price/:address/:block', async (req, res)=>{
  const token = req.params.address;
  const blockNumber = req.params.block;
  const doc = await swapSync.getPrice(token, blockNumber);

  if(doc.msg){
    res.status(400).json({msg: doc.msg});
  }else{
    res.status(200).json(doc);
  }
})

app.get('/api/v1/swap/price/:address', async (req, res)=>{
  const token = req.params.address;
  const doc = await swapSync.getPrice(token);

  if(doc.msg){
    res.status(400).json({msg: doc.msg});
  }else{
    res.status(200).json(doc);
  }
})


const port = process.env.SWAP_PORT || 3004;
const start = async () => {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    if(TRY_BM){
      await swapSync.warmup();
    }else{
      await swapSync.main();
    }

    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();