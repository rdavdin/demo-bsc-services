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
  const token = tokenSync.getToken(req.params.token);
  if(!token) {
    res.status(404).json({msg: `cannot find token with id ${req.params.token}`});
    return;
  }
    
  res.status(200).json({ token });
})

app.get('/api/v1/token/tokens/:tokens', (req, res) => {
  const tokens = req.params.tokens.split(',');
  res.status(200).json({tokens: tokenSync.getTokens(tokens)});
})

//FIXME: who can post tokens?
app.post('/api/v1/token/tokens', async (req, res) => {
  if(req.body.tokens) await tokenSync.addTokens(req.body.tokens);
  res.json({status: 200});
})

const port = process.env.TOKEN_PORT || 3003;
const start = async () => {
  try {
    const startMs = Date.now();

    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    await tokenSync.main();    

    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();