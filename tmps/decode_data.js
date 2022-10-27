const Web3 = require('web3');
const web3 = new Web3();

const typesArray = [
    {type: 'string', name: 'messanger'}, 
    {type: 'string', name: 'username'},
    {type: 'string', name: 'nome'},
    {type: 'string', name: 'cognome'},
    {type: 'string', name: 'email'}
];



let data = '0x00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000c496c2056696e6369746f72650000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b3535353535353535353536000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000336363600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001360000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013600000000000000000000000000000000000000000000000000000000000000';
const decodedParameters = web3.eth.abi.decodeParameters(typesArray, data);

console.log(JSON.stringify(decodedParameters, null, 4));


data = '0x000000000000000000000000000000000000000000000016d1fb78f7b62b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000042ae824fee5b85308eb';
const inputs = [
  {
    type: 'uint256',
    name: 'amount0In'
  },
  {
    type: 'uint256',
    name: 'amount1In'
  },
  {
    type: 'uint256',
    name: 'amount0Out'
  },
  {
    type: 'uint256',
    name: 'amount1Out'
  }
];
const topics = ['0x000000000000000000000000de91e495d0b79f74e9cac6c2bdcf2c07d9aba74d', '0x00000000000000000000000040f5a9bfd79585ffe39e93efed59b84d27d6d593'];
const decodedLog = web3.eth.abi.decodeLog(inputs, data, topics);
console.log(decodedLog);
