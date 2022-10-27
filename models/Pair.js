const mongoose = require('mongoose');

const PairSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, "Please provide address"],
    unique: true
  },
  base: {
    type: String,
    required: [true, "Please provide base token"],
  },
  quote: {
    type: String,
    required: [true, "Please provide quote token"],
  },
  baseName: {
    type: String
  },
  factory: {
    type: String,
    required: [true, "Please provide address of factory"]
  },
  blockNumber: {
    type: Number,
    required: [true, "Please provide blockNumber"]
  },
  txHash: {
    type: String,
    required: [true, "Please provide txHash"]
  }
});

module.exports = mongoose.model("Pair", PairSchema);