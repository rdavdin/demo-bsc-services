
require("dotenv").config();
require("express-async-errors");

const express = require("express");
const app = express();

// connectDB
const connectDB = require("../db/connect");

const Pair = require('../models/Pair');
app.use(express.json());

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGODB_URI_TEST);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );

    create();
  } catch (error) {
    console.log(error);
  }
};

start();