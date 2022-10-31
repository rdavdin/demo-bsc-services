require("dotenv").config();
const connectDB = require("../db/connect");
const PairSync = require('../data_sync/pair');

async function main() {
  try {
    const startMs = Date.now();

    const conn = await connectDB(process.env.MONGODB_URI_TEST);
    console.log(`db connected!`);
    conn.connection.on("disconnected", () => {
      console.log("db disconnected!");
    });

    let pairInstance = new PairSync();
    await pairInstance.main();

    /**
     * process1: 6810423 --> 12025547 //[v]
     * process2: 12025548 --> 17240671 //17150364
     * process3: 17240672 --> 22455796 //18981778
     * */
    // let latest = await web3.eth.getBlockNumber();
    // console.log(latest);
    // const from = parseInt(process.argv[2]);
    // const to = parseInt(process.argv[3]);
    // console.log(`start from ${from} to ${to}`);

    // await pairInstance.crawlPair(latest - 1000, latest, 30);

    const ms = Date.now() - startMs;
    console.log(`test pair end ${ms}`);
  } catch (error) {
    console.log(error);
  }
}

main();