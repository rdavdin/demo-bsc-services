const factories = {
  PANCAKE_FACTORY: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73'
}

const routers = {
  PANCAKE_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
}
const quoteTokens = {
  BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  USDT: "0x55d398326f99059ff775485246999027b3197955",
  USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  WBNB: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
}

const isWBNB = (token) => {
  token = token.toLowerCase();
  return token == quoteTokens.WBNB;
}

const isUSDType = (token) => {
  token = token.toLowerCase();
  return token == quoteTokens.BUSD || token == quoteTokens.USDT || token == quoteTokens.USDC;
}

const isQuote = (token) => {
  token = token.toLowerCase();
  return token == quoteTokens.BUSD || token == quoteTokens.USDT || token == quoteTokens.USDC || token == quoteTokens.WBNB;
}

const isSupportFactory = (address) => {
  address = address.toLowerCase();
  return address == factories.PANCAKE_FACTORY;
}

const getFactory = (address) => {
  address = address.toLowerCase();
  return address == factories.PANCAKE_FACTORY ? factories.PANCAKE_FACTORY : undefined;
}

const getQuoteName = (address) => {
  address = address.toLowerCase();
  if(address == quoteTokens.BUSD) return "BUSD";
  if(address == quoteTokens.USDT) return "USDT";
  if(address == quoteTokens.USDC) return "USDC";
  if(address == quoteTokens.WBNB) return "WBNB";  
}

module.exports = {
  isQuote,
  isWBNB,
  isUSDType,
  isSupportFactory,
  getFactory,
  getQuoteName
}

