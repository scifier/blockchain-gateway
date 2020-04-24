const BlockCypher = require('blockcypher');
const util = require('util');

const { BLOCKCYPHER_TOKEN } = process.env;
const COIN = 'btc';
const CHAIN = 'main';

const callbackApi = new BlockCypher(COIN, CHAIN, BLOCKCYPHER_TOKEN);
const blockcypher = {};

Object.keys(BlockCypher.prototype).forEach((methodName) => {
  if (methodName.charAt(0) !== '_') {
    blockcypher[methodName] = util.promisify(callbackApi[methodName].bind(callbackApi));
  }
});

(async () => {
  const blockNumber = 300000;

  const chain = await blockcypher.getChain();
  console.log('Current chain', chain);

  let blockHeigh = await blockcypher.getBlock(blockNumber, null);
  console.log('Block height without any optional URL params', blockHeigh);

  blockHeigh = await blockcypher.getBlock(blockNumber, { txstart: 2 });
  console.log('Block with an optional "txstart" param', blockHeigh);
})();
