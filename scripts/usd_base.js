
/**
 * exchange base and quote of pairs with quote not an USD type, but base be
 */
const {isUSDType, getQuoteName} = require('../data_sync/utils')
const PairModel = require('../models/Pair');

const quoteTokens = {
  BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  USDT: "0x55d398326f99059ff775485246999027b3197955",
  USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  WBNB: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
}

require("dotenv").config();
const connectDB = require("../db/connect");
async function main(){
  const startMs = Date.now();
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log(`db connected!`);

    // const pairs = await PairModel.find({ $or: [{base: {$eq: quoteTokens.BUSD}}, {base: {$eq: quoteTokens.USDC}}, {base: {$eq: quoteTokens.USDT}}] });
    
    // pairs.forEach(async pair => {
    //   if(!isUSDType(pair.quote)){
    //     console.log(pair.address);
    //     [pair.base, pair.quote] = [pair.quote, pair.base];
    //     await PairModel.findOneAndUpdate({address: pair.address}, pair, {new : true, runValidators: true});
    //   }
    // })

    const dbPairs = await PairModel.find({}).sort('numberBlock').select('address base quote blockNumber');
    if(dbPairs.length > 1){
      const p0 = dbPairs[0];
      const pl = dbPairs[dbPairs.length - 1];

      console.log(p0, pl);
    }

    
    console.log(`The end after ${Date.now() - startMs}  ms`);
  } catch (error) {
    console.log(error);
  }
}
main();