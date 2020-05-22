require('dotenv').config();
const { BitcoinNetwork } = require('../..');

const networkType = process.env.NETWORK_TYPE || 'testnet';
const accessToken = process.env.BLOCKCYPHER_TOKEN;

const { BTC_PRIVATE_KEY, BTC_ADDRESS, BTC_AMOUNT } = process.env;

const bitcoin = new BitcoinNetwork({ networkType, accessToken });

module.exports = (async () => {
  await bitcoin.connect(BTC_PRIVATE_KEY);
  console.log('Current account:', bitcoin.defaultAccount);
  console.log('=====');


  let tx;
  try {
    tx = await bitcoin.createTransaction(
      bitcoin.defaultAccount,
      BTC_ADDRESS || bitcoin.defaultAccount,
      BTC_AMOUNT || 0,
    );
    console.log('Transaction was created. tx:', tx);
  } catch (e) {
    console.log('Unable to create the transaction. ', e.message);
  }
  console.log('=====');


  let rawTx;
  try {
    rawTx = await bitcoin.signTransaction(tx);
    console.log('Transaction was signed. Raw tx hex:', rawTx);
  } catch (e) {
    console.log('Unable to sign the transaction. ', e.message);
  }
  console.log('=====');


  try {
    const txHash = await bitcoin.broadcastTransaction(rawTx);
    console.log('Transaction was broadcasted. txHash:', txHash);
  } catch (e) {
    console.log('Unable to broadcast the transaction. ', e.message);
  }
  console.log('=====');
})();
