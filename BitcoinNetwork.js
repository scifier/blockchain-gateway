const bitcoin = require('bitcoinjs-lib');
const BigNumber = require('bignumber.js');

const { delay, normalize } = require('./utils');
const TransactionError = require('./errors/TransactionError');
const AbstractNetwork = require('./AbstractNetwork');
const BlockCypherClient = require('./BlockCypherClient');

const STATUS_BACKOFF_ITERATIONS = [1250, 2500, 5000, 10000, 20000];
const DUST = 500;

/**
 * check if it's a Segwit or Non-Segwit transaction
 */
/* function isSegwit(rawTransaction) {
  return rawTransaction.substring(8, 12) === '0001';
} */


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
    this.protocol = 'bitcoin';

    // Use default options if they were not passed as constructor arguments
    this.networkType = (typeof options.networkType === 'string')
      ? options.networkType
      : 'testnet';
    this.explorer = options.explorer;

    // Setup provider and update networkType
    this.rpc = new BlockCypherClient(options);
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
      // NOTE: sign inputs with signInputAsync() for debugging
      // await Promise.all(tx.data.inputs.map((_, i) => tx.signInputAsync(i, keyPair)));
      tx.finalizeAllInputs();
      const rawTx = tx.extractTransaction().toHex();
      const { hash } = await this.rpc.decodeRawTx(rawTx);
      return {
        rawTx,
        txHash: hash,
      };
    };
    this.defaultAccount = address;
    return Promise.resolve([this.defaultAccount]);
  }


  generateKeypair() {
    const network = getBitcoinNetwork(this.networkType);
    const keyPair = bitcoin.ECPair.makeRandom({ network });
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
    const privateKey = keyPair.toWIF();
    // NOTE: Comment previous line and uncomment the next line to use private keys instead WIF
    // const privateKey = keyPair.privateKey.toString('hex');

    return {
      address,
      privateKey,
    };
  }


  /**
   * @param {string} address Bitcoin address
   *
   * @returns {Promise<string>} balance of a given address
   */
  async getBalance(address) {
    const data = await this.rpc.getAddressBalance(address);
    return normalize(data.final_balance, -8, 8);
  }


  getBytePrice() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    return this.rpc.getBytePrice();
  }


  getUtxo(address) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    return this.rpc.getUtxo(address || this.defaultAccount);
  }


  async createTransaction(from, to, amount) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }

    // Fetch UTXOs and transaction fees
    const [utxos, bytePrice] = await Promise.all([
      this.rpc.getUtxo(from),
      this.getBytePrice().catch(() => 2), // Defaults to 2 Satoshi
    ]);

    // Sort UTXOs by value
    utxos.sort((a, b) => new BigNumber(a.value).minus(b.value).toNumber());

    // Compute fees: Bitcoin tx Size = in*180 + out*34 + 10 +-in (225 bytes = 180+34+10-1)
    let fee = String(new BigNumber(Math.floor(225 * bytePrice))); // 225 bytes for 1-1 tx
    const inputFee = String(new BigNumber(Math.floor(179 * bytePrice))); // 179 bytes per input

    // Normalize tx value, check the balance and value before processing UTXOs
    const quantity = normalize(amount, 8);

    const balance = utxos.reduce((a, b) => new BigNumber(a).plus(b.value), 0);
    if (new BigNumber(quantity).plus(fee).isGreaterThan(balance)) {
      throw new TransactionError('Insufficient Funds');
    }
    if (new BigNumber(quantity).isLessThan(DUST)) {
      throw new TransactionError('Amount to low');
    }

    // Loop through sorted UTXOs in order to select the minimal number of inputs to perform the tx
    const selectedUtxos = [];
    let sum = new BigNumber(0);
    let suitableUtxo = null;
    const loopThroughUtxos = async () => {
      // Compute required amount in Satoshi
      const requiredAmount = new BigNumber(quantity).plus(fee);

      // Check if there is an UTXO where sum + utxo.value >= requiredAmount
      // eslint-disable-next-line no-restricted-syntax
      for (const utxo of utxos) {
        const value = new BigNumber(utxo.value);
        if (value.plus(sum).isGreaterThanOrEqualTo(requiredAmount)
        && (!suitableUtxo || value.isLessThan(suitableUtxo.value))) {
          suitableUtxo = utxo;
          break;
        }
      }

      if (!suitableUtxo) {
        if (utxos.length < 1) {
          throw new TransactionError('Insufficient Funds');
        }
        // Move greatest utxo to result.utxos array
        const greatestUtxo = utxos.pop();
        selectedUtxos.push(greatestUtxo);
        // Increase sum and fee because we use one more UTXO
        sum = sum.plus(greatestUtxo.value);
        fee = String(new BigNumber(fee).plus(inputFee));
        return loopThroughUtxos();
      }

      // Exit from loop if suitableUtxo is found
      sum = sum.plus(suitableUtxo.value);
      selectedUtxos.push(suitableUtxo);
      return { selectedUtxos, fee, sum };
    };
    await loopThroughUtxos();

    // Create a PSBT instance (Partially Signed Bitcoin Transaction)
    const network = getBitcoinNetwork(this.networkType);
    const psbt = new bitcoin.Psbt({ network });

    // Retrieve parent raw transactions
    const hashes = [...new Set(selectedUtxos.map((utxo) => utxo.tx_hash))];
    const rawTxs = {};
    await Promise.all(hashes.map((hash) => this.rpc.getRawTx(hash).then((rawTx) => {
      rawTxs[hash] = rawTx;
    })));

    // Add inputs
    const inputs = selectedUtxos.map((utxo) => {
      const previousTx = rawTxs[utxo.tx_hash];
      // if (isSegwit(previousTx)) {
      //   return {
      //     hash: utxo.tx_hash, // tx id
      //     index: utxo.tx_output_n, // vout
      //     witnessUtxo: {
      //       script: Buffer.from(utxo.script, 'hex'),
      //       value: utxo.value,
      //     },
      //   };
      // }
      // Not featured: input.witnessScript (A Buffer of the witnessScript for P2WSH)
      return {
        hash: utxo.tx_hash, // tx id
        index: utxo.tx_output_n, // vout
        nonWitnessUtxo: Buffer.from(previousTx, 'hex'),
        // Not featured: redeemScript (A Buffer of the redeemScript for P2SH)
      };
    });
    psbt.addInputs(inputs);

    // Add outputs
    const difference = new BigNumber(sum).minus(quantity).minus(fee);
    const outputs = [{
      address: to,
      value: Number(quantity),
    }];
    if (difference.isGreaterThanOrEqualTo(DUST)) {
      outputs.push({
        address: from,
        value: difference.toNumber(),
      });
    }
    psbt.addOutputs(outputs);

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
    // const { tx } = await this.rpc.pushRawTx(rawTransaction);
    // return tx;
    // Uncomment the previous block and comment the next line to return the transaction receipt
    await this.rpc.pushRawTx(rawTransaction);
    return true;
  }


  getTxStatus(transactionHash) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    let i = 0;
    const backoff = () => this.rpc.getTx(transactionHash)
      .then((res) => {
        if (!res.confirmations || res.confirmations < 1) {
          throw new TransactionError('Transaction was not mined');
        }
        return true;
      })
      .catch((err) => {
        if (i < STATUS_BACKOFF_ITERATIONS.length) {
          return delay(STATUS_BACKOFF_ITERATIONS[i++]).then(() => backoff());
        }
        throw new TransactionError(err);
      });
    return backoff();
  }


  get defaultExplorer() {
    if (this.networkType === 'testnet') {
      return 'https://live.blockcypher.com/btc-testnet/';
    }
    return 'https://live.blockcypher.com/btc/';
  }
}


module.exports = BitcoinNetwork;
