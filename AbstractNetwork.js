/**
 * Class representing an abstract network
 *
 * @property {Object} rpc Blockchain RPC client
 * @property {Function} connect Function for connecting to RPC using provided account
 * @property {Function} onAccountChange Function triggered after changing defaultAcount
 * @property {string} defaultAccount Provider selected account address (default: null)
 * @property {string} protocol default: null
 * @property {string} networkType 'mainnet' | 'testnet' (default: 'unknown')
 * @property {string} explorer default: 'https://etherscan.io/'
 *
 * @param {ProxyHandler} traps Traps used by the blockchain interceptor.
 * @returns {ProxyConstructor} Proxied blockchain.
 */
class AbstractNetwork {
  /**
   * Creates a new proxied blockchain.
   *
   * @constructor
   * @param {ProxyHandler} traps Traps used by the blockchain interceptor.
   * @returns {ProxyConstructor} Proxied blockchain.
   */
  constructor(traps = {}) {
    /**
     * @memberof AbstractNetwork
     * @abstract
     */
    this.rpc = null;

    /**
     * @memberof AbstractNetwork
     * @abstract
     */
    this.onAccountChange = null;

    /**
     * @memberof AbstractNetwork
     * @abstract
     */
    this.defaultAccount = null;

    /**
     * @memberof AbstractNetwork
     * @abstract
     */
    this.onNetworkChange = null;

    /**
     * @memberof AbstractNetwork
     * @abstract
     */
    this.protocol = null;

    /**
     * @memberof AbstractNetwork
     * @instance
     */
    this.networkType = 'unknown';

    return new Proxy(this, traps);
  }


  /**
   * Setting new default account via updateAccount will trigger onAccountChange event-like function
   *
   * @memberof AbstractNetwork
   * @instance
   *
   * @param {string} account Address to be used as defaultAccount
   */
  set defaultAccount(currentAccount) {
    if (this._defaultAccount !== currentAccount) {
      const previousAccount = this._defaultAccount;
      this._defaultAccount = currentAccount;

      if (typeof this.onAccountChange === 'function') {
        this.onAccountChange(previousAccount, currentAccount);
      }
    }
  }

  get defaultAccount() {
    return this._defaultAccount;
  }

  /**
   * Setting new network type via updateNetwork will trigger onNetworkChange event-like function
   *
   * @memberof AbstractNetwork
   * @instance
   *
   * @param {string} currentNetwork Network type ('testnet' || 'mainnet')
   */
  set networkType(currentNetwork) {
    if (this._networkType !== currentNetwork) {
      const previousNetwork = this._networkType;
      this._networkType = currentNetwork;

      if (typeof this.onNetworkChange === 'function') {
        this.onNetworkChange(previousNetwork, currentNetwork);
      }
    }
  }

  get networkType() {
    return this._networkType;
  }

  /**
   * @memberof AbstractNetwork
   * @instance
   *
   * @param {string} name Network name
   */
  set protocol(name) {
    if (!this._protocol) {
      this._protocol = name;
    }
  }

  get protocol() {
    return this._protocol;
  }

  /**
   * @memberof AbstractNetwork
   * @instance
   *
   * @param {string} link Link to blockchain explorer
   */
  set explorer(link) {
    this._explorer = link;
  }

  get explorer() {
    if (typeof this._explorer === 'string') {
      return this._explorer.replace(/\/$/, '');
    }
    return this.defaultExplorer.replace(/\/$/, '');
  }

  get defaultExplorer() {
    return `https://blockchair.com/${this.protocol}`;
  }

  generateKeypair() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  sign() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  recover() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  createTransaction() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  signTransaction() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  recoverTransaction() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  broadcastTransaction() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  connect() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
  }

  getTxLink(hash) {
    return `${this.explorer}/tx/${hash}`;
  }

  getAddressLink(address) {
    return `${this.explorer}/address/${address}`;
  }

  getBlockLink(blockNumber) {
    return `${this.explorer}/block/${blockNumber}`;
  }
}

module.exports = AbstractNetwork;
