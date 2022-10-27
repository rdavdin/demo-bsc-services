require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();

const TokenSync = require('../data_sync/token');
const tokenSync = new TokenSync();

const connectDB = require("../db/connect");

app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello! I'm Token Service.");
})

app.get('/api/v1/token/:token', (req, res) => {
  //TODO: return token info
})

app.get('/api/v1/token/:tokens', (req, res) => {
  //TODO: return a list of token info
})

app.post('/api/v1/token/tokens', async (req, res) => {
  //TODO: store the list of tokens into db. Who can do this?
  const tokens = req.body.tokens;
})

const port = process.env.TOKEN_PORT || 3003;
const start = async () => {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);


    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();