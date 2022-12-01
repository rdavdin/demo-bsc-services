require("dotenv").config();
require("express-async-errors");

const express = require("express");

const app = express();

// connectDB
const connectDB = require("./db/connect");
app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello!");
})

app.get('/:objects', (req, res) => {
  console.log(req.params);

  res.status(200).json(req.body);
})

app.post('/api/v2/token/tokens', (req, res) => {
  console.log(req.body);

  res.status(200).json(req.body);
})

const port = process.env.PORT || 3000;
const start = async () => {
  try {
    const startMs = Date.now();

    //await connectDB(process.env.MONGODB_URI);

    app.listen(port, () => {
      const ms = Date.now() - startMs;
      console.log(`Server is listening on port ${port}...(${ms})`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();