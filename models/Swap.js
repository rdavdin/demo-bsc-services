const mongoose = require('mongoose');

const SwapSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: [true, "Please provide address"],
  },
  base: {
    type: String,
    required: [true, "Please provide base token"],
  },
  quote: {
    type: String,
    required: [true, "Please provide quote token"],
  },
  baseAmount: {
    type: String,
    required: [true, "Please provide baseAmount"],
  },
  quoteAmount: {
    type: String,
    required: [true, "Please provide quoteAmount"],
  },
  isBuy: { //sender buys the base token
    type: Boolean,
    required: [true, "Please provide isBuy "]
  },
  blockNumber: {
    type: Number,
    required: [true, "Please provide blockNumber"]
  },
  txHash: {
    type: String,
    required: [true, "Please provide txHash"],
    unique: true
  },
  priceUSD: {
    type: String
  }
})

module.exports = mongoose.model('Swap', SwapSchema);