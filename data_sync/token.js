const TokenModel = require("../models/Token");

const Web3 = require("web3");
const web3 = new Web3("https://rpc.ankr.com/bsc");
// const web3 = new Web3("https://bsc-dataseed1.ninicoin.io");

class Token {
  constructor() {
    this.tokens = {};
  }

  updateState(token) {
    if (!this.tokens[token.address])
      this.tokens[token.address] = {
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
      };
  }

  async warmup() {
    const tokens = await TokenModel.find({});
    tokens.forEach((token) => {
      this.updateState(token);
    });
    console.log(tokens[0]);
    console.log(this.tokens[Object.keys(this.tokens)[0]]);
  }

  getToken(address) {
    return this.tokens[address];
  }

  getTokens(addresses) {
    return addresses.map((a) => this.getToken(a));
  }

  /**
   * @param tokens : array of objs {address, symbol, decimals, name}
   */
  async storeTokens(tokens) {
    try {
      await TokenModel.insertMany(tokens);
    } catch (error) {
      console.log("cannot insert this batch of tokens ", tokens);
      console.log(error);
    }
  }
}

require("dotenv").config();
const connectDB = require("../db/connect");
async function main() {
  try {
    const startMs = Date.now();

    const conn = await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    let tokenSync = new Token();
    await tokenSync.warmup();

    const ms = Date.now() - startMs;
    console.log(`time spent ${ms}`);
  } catch (error) {
    console.log(error);
  }
}

main();
