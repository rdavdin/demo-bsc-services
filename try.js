const Web3 = require('web3');
const web3 = new Web3('https://rpc.ankr.com/bsc');


// let count = 0;
// console.log(count++);
// setInterval(()=>{
//   console.log(count++);
// }, 3000);

// let reserve0 = '360211783110238402315721';
// let reserve1 = '98027756517513599082798389';
// reserve0 = web3.utils.toBN(reserve0);
// reserve1 = web3.utils.toBN(reserve1);
// console.log(reserve1/reserve0)
// console.log(reserve1.div(reserve0))

//{'pair1': {'pair':'pair1', 'base':'base1', 'quote':'quote1'}, 'pair2': {...}, ... }

// let pairs = {
//   '0x001': {pair: '0x001', base:'0xbase1', quote:'oxquote1'},
//   '0x002': {pair: '0x002', base:'0xbase2', quote:'oxquote2'},
//   '0x003': {pair: '0x003', base:'0xbase3', quote:'oxquote3'},
// };
// const pair4 = '0x004';
// pairs[pair4] = {pair: pair4, base:'0xbase4', quote:'oxquote4'};

// const addr = '0x004';
// console.log(pairs[addr]);
// console.log(pairs[addr].base);

// console.log(process.argv);
// const from = parseInt(process.argv[2]);
// const to = parseInt(process.argv[3]);

// console.log(from, to);

//working with Big Number
// const data1 = {
//   amount0In: "45646682438124054",
//   amount1In: "0",
//   amount0Out: "0",
//   amount1Out: "12306967801957908646",
// };
// const data2 = {
//   amount0In: "0",
//   amount1In: "10557549204094121786",
//   amount0Out: "38962516280669941",
//   amount1Out: "0",
// };

//e.g: DOR
//contract: 0x3465fD2D9f900e34280aBab60E8d9987B5b5bb47
//Decimals: 18
//totalSupply: 987825167899999000000000000
//1000000000000000000
//function totalSupply() external view returns (uint256);
// const decimal = 18;
// const total = '987825167899999000000000000';

// const toBN = web3.utils.toBN;
// const isBN = web3.utils.isBN;
// const decimal = 18;

// const amount1 = data1.amount0In.toString();
// const amount2 = data1.amount0In.toString(10);

// console.log(typeof data1.amount0In, amount1, amount2);



// How to decode parameters from data
const BigNumber = require('bignumber.js');
const {getNumber, getPrice} = require('./utils/format')
const toBN = web3.utils.toBN;
const isBN = web3.utils.isBN;
const decimal = '18';

let obj = {
  pair: '0x8db185761fd04433d37124b68ae4a47fb2bd55c0',
  base: '0x6679eb24f59dfe111864aec72b443d1da666b360',	//ARV Token : 8
  quote: '0xe9e7cea3dedca5984780bafc599bd69add087d56', //BUSD : 18
  blockNumber: 22506418,
  txHash: '0x7dacc6cc04346ae63432ec2143ccf29a7e498c3799a1c0c8fa8a9a259b9da965',
  isBuy: false,
  baseAmount: '6500000000000',
  quoteAmount: '8264691960856288140',
  priceUSD: 1271491.07090096,
  decimalB: 8,
  decimalQ: 18
}

obj = {
  "_id": {
    "$oid": "635fd6062eeee036a45fff5d"
  },
  "pair": "0x41ce7724435b9732aa49f713f6117b42e178a3e8",
  "base": "0x8a87c36bb9e9b91c76e7a0a374a59e57cf0c0f5b",
  "quote": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  "baseAmount": "326822969044443283959049388758",
  "quoteAmount": "1243979097662704688",
  "isBuy": false,
  "blockNumber": 22455934,
  "txHash": "0x40b899e24747651b9bd1ad05a6cacc702f7d26389caaaa57a9e51d641d79a569",
  "priceUSD": "0",
  "__v": 0
}

obj.decimalB = 18;
obj.decimalQ = 18;

//Step 1: calculate price just based on the amounts of base and quote, don't care to decimals
//Step 2: use getPrice to convert to real price

/**
 * return: {n0p1: price} : n token0 per 1 token1? e.g: 0.24343 token0 per 1 token1
  * @param {Number} decimal0, decimal1, n
  * @param {string} amount0, amount1 
 */
function calPriceBK(amount0, amount1, decimal0, decimal1){
  if(toBN(amount1).isZero()) return 0;
  const f = 8;
  const n = (amount1.length + f) < amount0.length ? 0 : amount1.length + f - amount0.length;

  const n0p1 = parseInt(toBN(amount0).mul(toBN('1'.padEnd(n+1,'0'))).div(toBN(amount1)))/Math.pow(10, n);
  return getPrice(n0p1, decimal1, decimal0);
}

/**
 * return: 1 token0 = n token1? e.g: 1 token0 per 0.24343 token1
 * @param {string} amount0
 * @param {string} amount1
 * @param {Number} decimal0
  * @param {Number} decimal1
 */
 const calPrice = (amount0, amount1, decimal0, decimal1) =>{
  if(toBN(amount0).isZero()) return 0;
  const f = 8;
  const n = (amount0.length + f) < amount1.length ? 0 : amount0.length + f - amount1.length;

  const n1p0 = parseInt(toBN(amount1).mul(toBN('1'.padEnd(n+1,'0'))).div(toBN(amount0)))/Math.pow(10, n);
  return getPrice(n1p0, decimal0, decimal1);
}

  let price = parseInt(toBN(obj.quoteAmount).mul(toBN('100000000')).div(toBN(obj.baseAmount)))/(10**8);
  price = getPrice(price, obj.decimalB); //for all decimals of quote is default, 18

  console.log(price);

const rs1 = calPrice(obj.baseAmount, obj.quoteAmount, obj.decimalB, obj.decimalQ);
const rs2 = calPrice(obj.quoteAmount, obj.baseAmount, obj.decimalQ, obj.decimalB);
console.log(`1 base ~ ${rs1} quote`);
console.log(`1 quote ~ ${rs2} base`);

const priceUSD = rs1*310;
console.log(priceUSD);