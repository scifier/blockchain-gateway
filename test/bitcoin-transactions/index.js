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

  const balance = await bitcoin.getBalance(bitcoin.defaultAccount);
  console.log('Current balance:', balance);
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
    console.log('Unable to create the transaction.', e.message);
  }
  console.log('=====');


  let rawTransaction;
  let transactionHash;
  try {
    const { rawTx, txHash } = await bitcoin.signTransaction(tx);
    rawTransaction = rawTx;
    transactionHash = txHash;
    console.log('Transaction was signed. Raw tx hex:', rawTx, 'txhash:', txHash);
  } catch (e) {
    console.log('Unable to sign the transaction.', e.message);
  }
  console.log('=====');


  try {
    await bitcoin.broadcastTransaction(rawTransaction);
    console.log('Transaction was broadcasted:', bitcoin.getTxLink(transactionHash));
  } catch (e) {
    console.log('Unable to broadcast the transaction.', e.message);
  }
  console.log('=====');
})();
