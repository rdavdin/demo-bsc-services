const Web3 = require('web3');

const {writeFile} = require('fs');

const SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ORDER_TOPIC = '0xed7cb6c9f6327abadac804e7b7c0033ad1ed0f4e1b259ff20ee6499ea527ab14';
const PAIR_CREATED_TOPIC = '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1';


// const web3 = new Web3('https://bsc-dataseed.binance.org');
const web3 = new Web3('https://rpc.ankr.com/bsc');

async function main(){
  /** block */
  const latest = await web3.eth.getBlockNumber();
  console.log(latest);

  // const logs = await web3.eth.getPastLogs({
  //   topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
  // });


  const block = await web3.eth.getBlock("latest");
  
  //get log of 3 first transactions from the block
  // let logs = [];
  // const l = block.transactions.length > 3 ? 3 : block.transactions.length;
  // for(let i = 0; i < 3; i++){
  //   const txHash = block.transactions[i];
  //   const log = await web3.eth.getTransactionReceipt(txHash);
  //   logs.push(log.logs);
  // }

  // console.log(logs);


  // writeFile("log.json", JSON.stringify(log), err => {
  //   if(err) console.log(`Failed to write file: ${err}`);
  //   else console.log("File written");
  // })

  /** tx receipt */
  // const swapTx = "0x6208fc80cb2e5c63299cfa72e85d8267b9403938b20ac8ea079b0c5639af9b2f";
  // const transferTx = "0xb75791b62e41aab7c2c7cd7f016a07ec8db97f5e48bf5bc73531c395edfdcbe6";
  // const txReceipt = await web3.eth.getTransactionReceipt(transferTx);
  // const txDetail = await web3.eth.getTransaction(txReceipt.transactionHash);
  // console.log(txDetail);
  
}

main();