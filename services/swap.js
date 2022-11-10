require("dotenv").config();
require("express-async-errors");
const express = require("express");
const SwapSync = require('../data_sync/swap');

const app = express();
const swapSync = new SwapSync();

const connectDB = require("../db/connect");

app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello! I'm Swap Service.");
})

app.get('/api/v1/swap/:address/:n', async (req, res)=>{
  const token = req.params.address;
  const n = req.params.n;
  const docs = await swapSync.getLastTs(token, n);

  if(docs.msg){
    res.status(400).json({msg: docs.msg});
  }else{
    res.status(200).json({ txs: docs });
  }
})

const port = process.env.SWAP_PORT || 3004;
const start = async () => {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    //TODO: comment to test, remember uncomment
    // await swapSync.main();

    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();