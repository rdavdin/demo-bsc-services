const mongoose = require('mongoose');
/**
 * Store price of bnb based on blockNumber
 */
 const WbnbBusdSchema = new mongoose.Schema({
  blockNumber: {
    type: Number,
    required: [true, "Please provide blockNumber"],
    unique: true
  },
  price: {
    type: String,
    required: [true, "Please provide price"],
  }
})

module.exports = mongoose.model('WbnbBusd', WbnbBusdSchema);