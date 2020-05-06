const axios = require('axios');
const Bottleneck = require('bottleneck');

const BlockCypherError = require('./errors/BlockCypherError');


/**
 * Class representing a BlockCypher API client for Bitcoin networks (mainnet and testnet3)
 */
class BlockCypherClient {
  /**
   * Creates a new BlockCypher API client
   *
   * @constructor
   *
   * @param {object} [options] constructor options
   * @param {string} [options.networkType] 'mainnet' or 'testnet' (default: 'testnet')
   * @param {string} [options.accessToken] your BlockCypher access token (default: '')
   *
   * @returns {BlockCypherClient} BlockCypher API client instance
   */
  constructor(options = {}) {
    const networkType = (typeof options.networkType === 'string')
      ? options.networkType
      : 'testnet';

    this.accessToken = (typeof options.accessToken === 'string')
      ? options.accessToken
      : '';

    this.endpoint = (networkType === 'testnet')
      ? 'https://api.blockcypher.com/v1/btc/test3'
      : 'https://api.blockcypher.com/v1/btc/main';

    // Rate limiter for Blockcypher (max 3 requests per second)
    this.limiter = new Bottleneck({ maxConcurrent: 1, minTime: 333 });

    return this;
  }


  /**
   * Wrapper for get requests
   *
   * @param {string} path
   * @param {object} options
   *
   * @returns BlockCypher Api response
   */
  async _get(path, options = {}) {
    const endpoint = `${this.endpoint}/${path}`;
    const params = options;
    delete params.networkType;

    try {
      const { data } = await this.limiter.schedule(() => axios.get(
        endpoint,
        { params },
      ));
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
  async _post(path, options = {}) {
    const endpoint = `${this.endpoint}/${path}`;
    const requestObject = options;

    try {
      const { data } = await this.limiter.schedule(() => axios.post(
        endpoint,
        requestObject,
        { token: this.accessToken },
      ));
      return data;
    } catch (err) {
      throw new BlockCypherError(err);
    }
  }


  /**
   * Get current byte price
   *
   * @returns {number} byte price in Satoshi
   */
  async getBytePrice() {
    const data = await this._get('');
    return Math.floor(data.low_fee_per_kb / 1024);
  }


  /**
   * Get address info
   * https://www.blockcypher.com/dev/bitcoin/#address-endpoint
   *
   * @param {string} address bitcoin address
   * @param {object} [params] querry params
   *
   * @returns {object} BlockCypher address endpoint response
   */
  getAddressInfo(address, params = {}) {
    return this._get(`addrs/${address}`, params);
  }


  /**
   * Get Unspent Transaction Outputs for a given address
   *
   * @param {string} address bitcoin address
   * @returns {Array<{object}>} array of unspent outputs
   */
  async getUtxo(address) {
    const options = { unspentOnly: true, includeScript: true };
    const { txrefs } = await this.getAddressInfo(address, options);
    return txrefs;
  }


  /**
   * Get transaction by transaction hash
   * https://www.blockcypher.com/dev/bitcoin/#transaction-hash-endpoint
   *
   * @param {string} txHash transaction hash
   * @param {object} [params] querry params
   *
   * @returns {object} BlockCypher address endpoint response
   */
  getTx(txHash, params = {}) {
    return this._get(`txs/${txHash}`, params);
  }


  /**
   * Get raw transaction hex
   *
   * @param {string} txHash transaction hash
   *
   * @returns {string} raw transaction hex
   */
  async getRawTx(txHash) {
    const { hex } = await this.getTx(txHash, { includeHex: true });
    return hex;
  }


  /**
   * Broadcast raw signed transaction
   * https://www.blockcypher.com/dev/bitcoin/#push-raw-transaction-endpoint
   *
   * @param {string} rawTransaction signed raw transaction
   *
   * @returns {object} BlockCypher push raw transaction endpoint respons
   */
  pushRawTx(rawTransaction) {
    return this._post('txs/push', { tx: rawTransaction });
  }


  /**
   * Decode a raw transaction
   * https://www.blockcypher.com/dev/bitcoin/#decode-raw-transaction-endpoint
   *
   * @param {string} rawTransaction raw transaction
   *
   * @returns {object} BlockCypher TX object https://www.blockcypher.com/dev/bitcoin/#tx
   */
  decodeRawTx(rawTransaction) {
    return this._post('txs/decode', { tx: rawTransaction });
  }
}


module.exports = BlockCypherClient;
