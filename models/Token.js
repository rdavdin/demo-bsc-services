//to store basic info of a particular token if it was queried from blockchain
const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, "Please provide address"],
    unique: true
  },
  symbol: {
    type: String,
    required: [true, "Please provide symbol"],
  },
  decimals: {
    type: Number,
    required: [true, "Please provide decimals"],
  },
  name: {
    type: String,
    required: [true, "Please provide name"],
  }
});

module.exports = mongoose.model('Token', TokenSchema);