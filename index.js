const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');

const BlockCypherClient = require('./BlockCypherClient');

const {
  BLOCKCYPHER_TOKEN,
  NETWORK_TYPE,
  SENDER_WIF,
  AMOUNT,
  FEE,
} = process.env;


/**
 * Get bitcoinjs-lib network from network type
 * @param {string} networkType testnet | mainnet
 *
 * @returns network object
 */
function getNetwork(networkType) {
  return (networkType === 'testnet')
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;
}


/**
 * Get new ECPair from private key
 *
 * @param {string} privateKey uncompressed private key
 * @param {string} networkType testnet | mainnet
 *
 * @returns {object} new bitcoin ECPair
 */
function getKeypairFromPrivateKey(privateKey, networkType) {
  const network = getNetwork(networkType);
  return bitcoin.ECPair.fromPrivateKey(
    Buffer.from(privateKey, 'hex'),
    { compressed: true, network },
  );
}


/**
 * Get new ECPair from WIF
 *
 * @param {string} wif compressed WIF private key
 * @param {string} networkType testnet | mainnet
 *
 * @returns {object} new bitcoin ECPair
 */
function getKeypairFromWif(wif, networkType) {
  const network = getNetwork(networkType);
  return bitcoin.ECPair.fromWIF(wif, network);
}


/**
 * Get address of a given ECPair
 *
 * @param {object} keyPair bitcoin ECPair
 * @param {string} networkType testnet | mainnet
 *
 * @returns {object} new bitcoin ECPair
 */
function getAddressFromKeypair(keyPair, networkType) {
  const network = getNetwork(networkType);
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
  return address;
}


/**
 * check if it's a Segwit or Non-Segwit transaction
 */
function isSegwit(rawTransaction) {
  return rawTransaction.substring(8, 12) === '0001';
}


(async () => {
  const bcc = new BlockCypherClient({ networkType: NETWORK_TYPE, accessToken: BLOCKCYPHER_TOKEN });

  const keypair = getKeypairFromWif(SENDER_WIF, NETWORK_TYPE);
  const address = getAddressFromKeypair(keypair, NETWORK_TYPE);
  console.log('Your public key is', keypair.publicKey.toString('hex'));
  console.log('Your address is', address);
  console.log('=====');


  console.log('Fetching list of your unspent transaction outputs...');
  const utxos = await bcc.getUtxo(address);
  console.log('Your UTXOs:', utxos);
  console.log('=====');


  // TODO: select utxo correctly
  let [selectedUtxo] = utxos;
  for (const utxo of utxos) {
    if (utxo.value < selectedUtxo.value) {
      selectedUtxo = utxo;
    }
  }

  // const rawTransaction = await getRawTx(selectedUtxo.tx_hash);
  const parentTx = await bcc.getTx(selectedUtxo.tx_hash, { includeHex: true });
  const rawTransaction = parentTx.hex;
  console.log('PARENT TX', parentTx);

  console.log('Origin raw transaction:', rawTransaction);
  console.log('=====');

  const psbt = new bitcoin.Psbt({ network: getNetwork(NETWORK_TYPE) });
  const input = {
    hash: selectedUtxo.tx_hash, // tx id
    index: selectedUtxo.tx_output_n, // vout
  };

  if (isSegwit(rawTransaction)) {
    input.witnessUtxo = {
      script: Buffer.from(selectedUtxo.script, 'hex'),
      value: selectedUtxo.value,
    };
    // Not featured: input.witnessScript (A Buffer of the witnessScript for P2WSH)
  } else {
    input.nonWitnessUtxo = Buffer.from(rawTransaction, 'hex');
  }
  // Not featured: input.redeemScript (A Buffer of the redeemScript for P2SH)
  console.log('Used input:', input);


  psbt.addInput(input);

  const output = {
    address,
    value: Number(AMOUNT),
    // script: ??
  };
  console.log('Created output:', output);

  psbt.addOutput(output);
  if (Number(AMOUNT) + Number(FEE) < selectedUtxo.value) {
    // Return the rest back to the sender as additional output
    // TODO: need to check if this is a self-tx (to minimize outputs)
    const change = {
      address,
      value: selectedUtxo.value - Number(AMOUNT) - Number(FEE),
    };
    console.log('Your change:', change);
    psbt.addOutput(change);
  }


  // Sign transaction
  psbt.signInput(0, keypair);
  psbt.finalizeAllInputs();
  const newRawTx = psbt.extractTransaction().toHex();
  console.log('Transaction was signed. Raw tx hex:', newRawTx);
  console.log('=====');


  console.log('Transaction broadcasted', await bcc.pushRawTx(newRawTx));
})();
