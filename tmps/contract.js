const Web3 = require('web3');

const web3 = new Web3('https://rpc.ankr.com/bsc');

const lpContractABI = require('./PancakePair.json');
const fiwaBusdAddress = "0x4311ed024fb8c60fC010D0E99e93E1a7935e8c1d";
const erc20ABI = require('./Erc20.json');

const myContract = new web3.eth.Contract(lpContractABI, fiwaBusdAddress);

async function main(){
  const name = await myContract.methods.name().call();
  const token0 = await myContract.methods.token0().call();
  const token1 = await myContract.methods.token1().call();
  console.log(name, token0, token1);

  const token0Contract = new web3.eth.Contract(erc20ABI, token0);
  const token0Symbol = await token0Contract.methods.symbol().call();
  const token1Contract = new web3.eth.Contract(erc20ABI, token1);
  const token1Symbol = await token1Contract.methods.symbol().call();
  console.log(token0Symbol, token1Symbol);
}

main();
