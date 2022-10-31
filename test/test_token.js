require("dotenv").config();
const connectDB = require("../db/connect");
const TokenSync = require('../data_sync/token');
async function main() {
  try {
    const startMs = Date.now();

    const conn = await connectDB(process.env.MONGODB_URI_TEST);
    console.log(`db connected!`);

    let tokenSync = new TokenSync();
    await tokenSync.main();

    const ms = Date.now() - startMs;
    console.log(`test_token end: ${ms} ms`);
  } catch (error) {
    console.log(error);
  }
}

main();