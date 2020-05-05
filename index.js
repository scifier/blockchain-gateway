const BitcoinNetwork = require('./BitcoinNetwork');

const {
  BLOCKCYPHER_TOKEN,
  NETWORK_TYPE,
  SENDER_WIF,
  AMOUNT,
  FEE,
} = process.env;


(async () => {
  const bitcoin = new BitcoinNetwork({
    networkType: NETWORK_TYPE,
    accessToken: BLOCKCYPHER_TOKEN,
  });

  await bitcoin.connect(SENDER_WIF);
  console.log('Current account:', bitcoin.defaultAccount);
  console.log('=====');

  const tx = await bitcoin.createTransaction(
    bitcoin.defaultAccount, bitcoin.defaultAccount, AMOUNT, FEE,
  );
  console.log('Transaction was created. tx:', tx);
  console.log('=====');

  const rawTx = await bitcoin.signTransaction(tx);
  console.log('Transaction was signed. Raw tx hex:', rawTx);
  console.log('=====');

  const txHash = await bitcoin.broadcastTransaction(rawTx);
  console.log('Transaction was broadcasted. txHash:', txHash);
  console.log('=====');
})();
