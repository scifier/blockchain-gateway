const bitcoin = require('bitcoinjs-lib');

const { delay } = require('./utils');
const AbstractNetwork = require('./AbstractNetwork');
const BlockCypherClient = require('./BlockCypherClient');


/**
 * check if it's a Segwit or Non-Segwit transaction
 */
function isSegwit(rawTransaction) {
  return rawTransaction.substring(8, 12) === '0001';
}


/**
 * Get bitcoinjs-lib network from network type
 * @param {string} networkType testnet | mainnet
 *
 * @returns network object
 */
function getBitcoinNetwork(networkType) {
  return (networkType === 'testnet')
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;
}


/**
 * Class representing a Bitcoin blockchain
 *
 * @extends AbstractNetwork
 */
class BitcoinNetwork extends AbstractNetwork {
  /**
   * Creates a new proxied Bitcoin blockchain.
   *
   * @constructor
   *
   * @param {object} [options] blockchain constructor options
   * @param {string} [options.networkType] 'mainnet' or 'testnet' (default: 'testnet')
   *
   * @returns {Proxy} Proxied Bitcoin blockchain
   */
  constructor(options = {}) {
    super();
    this.networkName = 'Bitcoin';

    // Use default options if they were not passed as constructor arguments
    const networkType = (typeof options.networkType === 'string')
      ? options.networkType
      : 'testnet';
    const defaultExplorer = (networkType === 'testnet')
      ? 'https://live.blockcypher.com/btc-testnet'
      : 'https://live.blockcypher.com/btc';

    // Setup provider and update networkType
    this.rpc = new BlockCypherClient(options);
    this.networkType = networkType;

    this.explorer = (typeof options.explorer === 'string')
      ? options.explorer.replace(/\/$/, '')
      : defaultExplorer;
  }


  connect(privateKey) {
    const network = getBitcoinNetwork(this.networkType);
    // Get new ECPair from WIF
    const keyPair = bitcoin.ECPair.fromWIF(privateKey, network);
    // NOTE: Comment previous line and uncomment the next block to use private keys instead WIF
    // const keyPair = bitcoin.ECPair.fromPrivateKey(
    //   Buffer.from(privateKey, 'hex'),
    //   { compressed: true, network },
    // );
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
    // Update defaultAccount
    this.signTransaction = async (tx) => {
      await tx.signAllInputsAsync(keyPair);
      tx.finalizeAllInputs();
      return tx.extractTransaction().toHex();
    };
    this.defaultAccount = address;
    return Promise.resolve([this.defaultAccount]);
  }


  generateAccount() {
    const network = getBitcoinNetwork(this.networkType);
    const keyPair = bitcoin.ECPair.makeRandom({ network });
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
    const privateKey = keyPair.toWIF();

    return {
      address,
      privateKey,
    };
  }


  getBytePrice() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    return this.rpc.getBytePrice();
  }


  getUtxo() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    return this.rpc.getUtxo(this.defaultAccount);
  }


  async createTransaction(from, to, amount, fee) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }

    const network = getBitcoinNetwork(this.networkType);
    const utxos = await this.rpc.getUtxo(from);

    // TODO: select utxo correctly
    let [selectedUtxo] = utxos;
    for (const utxo of utxos) {
      if (utxo.value < selectedUtxo.value) {
        selectedUtxo = utxo;
      }
    }

    const rawTransaction = await this.rpc.getRawTx(selectedUtxo.tx_hash);
    const psbt = new bitcoin.Psbt({ network });

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
    psbt.addInput(input);
    const output = {
      address: this.defaultAccount,
      value: Number(amount),
    };
    psbt.addOutput(output);
    if (Number(amount) + Number(fee) < selectedUtxo.value) {
      const change = {
        address: this.defaultAccount,
        value: selectedUtxo.value - amount - fee,
      };
      psbt.addOutput(change);
    }
    return psbt;
  }


  async recoverTransaction(rawTransaction) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    const { inputs } = await this.rpc.decodeRawTx(rawTransaction);
    return [...new Set(inputs.map((input) => input.addresses))];
  }


  async broadcastTransaction(rawTransaction) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    const { hash } = await this.rpc.pushRawTx(rawTransaction);
    return hash;
  }


  getTxStatus(transactionHash) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    const iterations = [1250, 2500, 5000, 10000, 20000];
    let i = 0;
    const backoff = () => this.rpc.getTx(transactionHash)
      .then((res) => {
        if (!res.confirmations || res.confirmations < 1) {
          throw new Error('Transaction not mined yet or reverted');
        }
        return true;
      })
      .catch((err) => {
        if (i < iterations.length) {
          return delay(iterations[i++]).then(() => backoff());
        } throw err;
      });
    return backoff();
  }
}


module.exports = BitcoinNetwork;
