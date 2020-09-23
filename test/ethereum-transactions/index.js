require('dotenv').config();
const { EthereumNetwork } = require('../..');

const networkType = process.env.NETWORK_TYPE || 'testnet';
const accessToken = process.env.INFURA_TOKEN;

const { ETH_PRIVATE_KEY, ETH_ADDRESS, ETH_AMOUNT } = process.env;

const ethereum = new EthereumNetwork({ networkType, accessToken });

module.exports = (async () => {
  await ethereum.connect(ETH_PRIVATE_KEY);
  console.log('Current account:', ethereum.defaultAccount);
  console.log('=====');

  const balance = await ethereum.getBalance(ethereum.defaultAccount);
  console.log('Current balance:', balance);
  console.log('=====');

  let tx;
  try {
    tx = await ethereum.createTransaction(
      ethereum.defaultAccount,
      ETH_ADDRESS || ethereum.defaultAccount,
      ETH_AMOUNT || 0,
    );
    console.log('Transaction was created. tx:', tx);
  } catch (e) {
    console.log('Unable to create the transaction.', e.message);
  }
  console.log('=====');


  let rawTransaction;
  let transactionHash;
  try {
    const { rawTx, txHash } = await ethereum.signTransaction(tx);
    rawTransaction = rawTx;
    transactionHash = txHash;
    console.log('Transaction was signed. Raw tx hex:', rawTx, 'txhash:', txHash);
  } catch (e) {
    console.log('Unable to sign the transaction.', e.message);
  }
  console.log('=====');


  try {
    await ethereum.broadcastTransaction(rawTransaction);
    console.log('Transaction was broadcasted:', ethereum.getTxLink(transactionHash));
  } catch (e) {
    console.log('Unable to broadcast the transaction.', e.message);
  }
  console.log('=====');
})();
