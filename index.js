const BitcoinNetwork = require('./BitcoinNetwork');
const EthereumNetwork = require('./EthereumNetwork');

const {
  BLOCKCYPHER_TOKEN,
  INFURA_TOKEN,
  NETWORK_TYPE,
  SENDER_WIF,
  AMOUNT,
  FEE,
} = process.env;


(async () => {
  const ethereum = new EthereumNetwork({
    networkType: NETWORK_TYPE,
    accessToken: INFURA_TOKEN,
  });

  const bitcoin = new BitcoinNetwork({
    networkType: NETWORK_TYPE,
    accessToken: BLOCKCYPHER_TOKEN,
  });

  const { privateKey } = ethereum.generateAccount();
  console.log('Random Ethereum account generated. pkey:', privateKey);
  console.log('=====');

  await ethereum.connect(privateKey);
  console.log('Current Ethereum account:', ethereum.defaultAccount);
  console.log('=====');

  await bitcoin.connect(SENDER_WIF);
  console.log('Current Bitcoin account:', bitcoin.defaultAccount);
  console.log('=====');

  const tx = await bitcoin.createTransaction(
    bitcoin.defaultAccount, bitcoin.defaultAccount, AMOUNT, FEE,
  );
  console.log('Transaction was created. tx:', tx);
  console.log('=====');

  const rawTx = await bitcoin.signTransaction(tx);
  console.log('Transaction was signed. Raw tx hex:', rawTx);
  console.log('=====');

  try {
    const txHash = await bitcoin.broadcastTransaction(rawTx);
    console.log('Transaction was broadcasted. txHash:', txHash);
  } catch (e) {
    console.log('Unable to broadcasted the transaction. ', e.message);
  }
  console.log('=====');
})();
