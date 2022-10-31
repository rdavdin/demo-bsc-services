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
// const {getNumber, getPrice} = require('./utils/format')
// const toBN = web3.utils.toBN;
// const isBN = web3.utils.isBN;
// const decimal = '18';

// const obj = {
//   pair: '0x8db185761fd04433d37124b68ae4a47fb2bd55c0',
//   base: '0x6679eb24f59dfe111864aec72b443d1da666b360',	//ARV Token : 8
//   quote: '0xe9e7cea3dedca5984780bafc599bd69add087d56', //BUSD : 18
//   blockNumber: 22506418,
//   txHash: '0x7dacc6cc04346ae63432ec2143ccf29a7e498c3799a1c0c8fa8a9a259b9da965',
//   isBuy: false,
//   baseAmount: '6500000000000',
//   quoteAmount: '8264691960856288140',
//   priceUSD: 1271491.07090096
// }

// let price = parseInt(toBN(obj.quoteAmount).mul(toBN('100000000')).div(toBN(obj.baseAmount)))/(10**8);
// console.log('priceBn', getPrice(price, 8, 18));

// let total = 0;
// let errorCount = 0;
// function process(){
//   console.log('start process');
//   try {
//     const step = 10;
//     let skip = total;
//     console.log(skip, total);
//     if(errorCount < 2){
//       throw new Error("hehe ");
//     }
//     skip += step;
//     total = skip;
//   } catch (error) {
//     errorCount++;
//     console.log('catch error and call again ', errorCount);
//     process();
//     return;
//   }
//   console.log('before setTimeout');
//   setTimeout(() => {
//     process();
//   }, 1000);
//   console.log('end process ', errorCount);
// }

// function main(){
//   console.log('start main');
//   process();
//   console.log('end!');
// }
// main();


// async function test(){
//   const address = "0x8935daecF659B32b2c3a18C561b31074D73e11F7";

//   try {
//     const code = await web3.eth.getCode(address, 'latest');
//     if(code){
//       console.log(code);
//     }else{
//       console.log("cannot find code");
//     }
//   } catch (error) {
//     console.log(error);
//   }
// }

// test();