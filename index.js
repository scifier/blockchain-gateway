const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');

const { BlockCypherError } = require('./errors');

const {
  BLOCKCYPHER_TOKEN,
  NETWORK_TYPE,
  SENDER_WIF,
  AMOUNT,
  FEE,
} = process.env;
const API_BASE = 'https://api.blockcypher.com/v1';
const COIN = 'btc';


/**
 * Wrapper for get requests
 *
 * @param {string} path
 * @param {object} options
 *
 * @returns BlockCypher Api response
 */
async function _get(path, options = {}) {
  const chain = (options && options.networkType === 'testnet') ? 'test3' : 'main';
  const endpoint = `${API_BASE}/${COIN}/${chain}/${path}`;
  const params = options;
  delete params.networkType;

  try {
    const { data } = await axios.get(endpoint, { params });
    return data;
  } catch (err) {
    throw new BlockCypherError(err);
  }
}


/**
 * Wrapper for post requests
 *
 * @param {string} path
 * @param {object} options
 *
 * @returns BlockCypher Api response
 */
async function _post(path, options = {}) {
  const chain = (options && options.networkType === 'testnet') ? 'test3' : 'main';
  const endpoint = `${API_BASE}/${COIN}/${chain}/${path}`;
  const requestObject = options;
  delete requestObject.networkType;

  try {
    const { data } = await axios.post(endpoint, requestObject, { token: BLOCKCYPHER_TOKEN });
    return data;
  } catch (err) {
    throw new BlockCypherError(err);
  }
}


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
 * Get byte price estimations
 *
 * @param {object} options
 */
async function getDustPrice(options = {}) {
  const data = await _get('', options);
  return Math.floor(data.low_fee_per_kb / 1024);
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
  // TODO: make use of networkType or remove it
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
  return address;
}


function getAddressInfo(address, params = {}) {
  return _get(`addrs/${address}`, params);
}


async function getUtxo(address) {
  const { txrefs } = await getAddressInfo(address, { unspentOnly: true, includeScript: true });
  return txrefs;
}


function getTx(txHash, params = {}) {
  return _get(`txs/${txHash}`, params);
}


async function getRawTx(txHash) {
  const { hex } = await getTx(txHash, { includeHex: true });
  return hex;
}


/**
 * check if it's a Segwit or Non-Segwit transaction
 */
function isSegwit(rawTransaction) {
  return rawTransaction.substring(8, 12) === '0001';
}


function pushRawTx(rawTransaction) {
  return _post('txs/push', { tx: rawTransaction });
}


(async () => {
  const keypair = getKeypairFromWif(SENDER_WIF, NETWORK_TYPE);
  const address = getAddressFromKeypair(keypair);
  console.log('Your public key is', keypair.publicKey.toString('hex'));
  console.log('Your address is', address);
  console.log('=====');


  console.log('Fetching list of your unspent transaction outputs...');
  const utxos = await getUtxo(address);
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
  const parentTx = await getTx(selectedUtxo.tx_hash, { includeHex: true });
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
    value: AMOUNT,
    // script: ??
  };
  console.log('Created output:', output);

  psbt.addOutput(output);
  if (AMOUNT + FEE < selectedUtxo.value) {
    // Return the rest back to the sender as additional output
    // TODO: need to check if this is a self-tx (to minimize outputs)
    const change = {
      address,
      value: selectedUtxo.value - AMOUNT - FEE,
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


  console.log('Transaction broadcasted', await pushRawTx(newRawTx));
})();
