const mongoose = require('mongoose');

const TokenPriceSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, "Please provide address"]
  },
  block: {
    type: Number,
    required: [true, "Please provide blockNumber"]
  },
  date: {
    type: String,
    required: [true, "Please provide date"]
  },
  price: {
    type: String
  }
});

module.exports = mongoose.model("TokenPrice", TokenPriceSchema);