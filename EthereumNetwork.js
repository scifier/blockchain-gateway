const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const { delay, normalize } = require('./utils');
const TransactionError = require('./errors/TransactionError');
const AbstractNetwork = require('./AbstractNetwork');

const STATUS_BACKOFF_ITERATIONS = [1250, 2500, 5000, 10000, 20000];

/**
 * Helper function for convert networkId to networkType
 *
 * @param {string} networkId
 */
function getNetworkTypeFromId(networkId) {
  if (Number(networkId) === 1) {
    return 'mainnet';
  } if (Number(networkId) === 3) {
    return 'testnet';
  } return 'unknown';
}


/**
 * Class representing an Ethereum blockchain
 *
 * @extends AbstractNetwork
 */
class EthereumNetwork extends AbstractNetwork {
  /**
   * Creates a new proxied Ethereum blockchain.
   *
   * @constructor
   *
   * @param {object} [options] blockchain constructor options
   * @param {string} [options.networkType] 'mainnet' or 'testnet' (default: 'testnet')
   * @param {string} [options.accessToken] Infura project id (used if Metamask is not available)
   *
   * @returns {Proxy} Proxied Ethereum blockchain
   */
  constructor(options = {}) {
    super();
    this.protocol = 'ethereum';

    // Use default options if they were not passed as constructor arguments
    const networkType = (typeof options.networkType === 'string')
      ? options.networkType
      : 'testnet';
    this.explorer = options.explorer;

    // Modern Ethereum browser detected
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.autoRefreshOnNetworkChange = false;
      if (window.ethereum.enable) {
        this.connect = () => window.ethereum.enable()
          .then(([account]) => {
            this.defaultAccount = account;
            return [this.defaultAccount];
          });
      } else {
        this.connect = () => window.ethereum.request({ method: 'eth_requestAccounts' })
          .then(([account]) => {
            this.defaultAccount = account;
            return [this.defaultAccount];
          });
      }

      // Setup provider, update defaultAccount and networkType
      this.rpc = new Web3(window.ethereum);
      this.defaultAccount = window.ethereum.selectedAddress;
      this.networkType = getNetworkTypeFromId(window.ethereum.networkVersion);

      // Handle provider updates
      if (this.rpc.currentProvider && this.rpc.currentProvider.publicConfigStore) {
        this.rpc.currentProvider.publicConfigStore.on('update', ({ networkVersion, selectedAddress }) => {
          this.defaultAccount = selectedAddress || window.ethereum.selectedAddress;
          this.networkType = getNetworkTypeFromId(networkVersion);
        });
      } else {
        window.ethereum.on('accountsChanged', ([account]) => {
          this.defaultAccount = account;
        });
        window.ethereum.on('chainChanged', (chainId) => {
          this.networkType = getNetworkTypeFromId(chainId);
        });
      }

      this.sign = (message) => this.rpc.eth.personal.sign(message, this.defaultAccount)
        .catch((err) => new TransactionError(err));

      this.signTransaction = () => { throw new Error('MetaMask does not support signTransaction method'); };
    } else


    // Legacy Ethereum browser detected
    if (typeof window !== 'undefined' && window.web3) {
      // Make connect function to work same as modern MetaMask's ethereum.connect()
      this.connect = () => {
        this.defaultAccount = window.web3.defaultAccount;
        return Promise.resolve([this.defaultAccount]);
      };

      // Setup provider, update defaultAccount and networkType
      this.rpc = new Web3(window.web3.currentProvider);
      this.defaultAccount = window.web3.defaultAccount;
      window.web3.version.getNetwork((err, networkVersion) => {
        this.networkType = (!err)
          ? getNetworkTypeFromId(networkVersion)
          : 'unknown';
      });

      // Handle provider updates
      this.rpc.currentProvider.publicConfigStore.on('update', ({ networkVersion, selectedAddress }) => {
        this.defaultAccount = selectedAddress;
        this.networkType = getNetworkTypeFromId(networkVersion);
      });

      this.sign = (message) => this.rpc.eth.personal.sign(message, this.defaultAccount)
        .catch((err) => {
          if (err.message && err.message.includes('User denied')) {
            throw new Error('Message signature was rejected');
          } throw err;
        });

      this.signTransaction = () => { throw new Error('MetaMask does not support signTransaction method'); };
    } else


    // Non Ethereum browser detected and no rpc endpoint provided
    if (typeof window !== 'undefined' && !window.web3 && !window.ethereum && !options.accessToken) {
      this.connect = () => { throw new Error('Non Ethereum browser detected'); };
    } else


    // NodeJS or io.js environment detected (will detect even if global window object is defined)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Setup provider and update networkType
      const endpoint = (networkType === 'testnet')
        ? `https://ropsten.infura.io/v3/${options.accessToken}`
        : `https://mainnet.infura.io/v3/${options.accessToken}`;
      this.rpc = new Web3(new Web3.providers.HttpProvider(endpoint));
      this.rpc.eth.transactionPollingTimeout = 5;
      this.networkType = networkType;

      this.connect = (privateKey) => {
        // Sanitize private key
        let pkey = privateKey || '';
        if (pkey.length === 64) {
          pkey = `0x${privateKey}`;
        } else if (pkey.length !== 66) {
          throw new Error('Invalid privateKey');
        }

        // Update defaultAccount and link signing functions to instance root
        // Can be changed with the older "this.rpc.eth.accounts.privateKeyToAccount(pkey);"
        const { address, signTransaction, sign } = this.rpc.eth.accounts.wallet.clear().add(pkey);
        this.defaultAccount = address;
        this.signTransaction = (tx) => signTransaction(tx)
          .then(({ rawTransaction, transactionHash }) => ({
            rawTx: rawTransaction,
            txHash: transactionHash,
          }));
        this.sign = (message) => {
          const { signature } = sign(message);
          return Promise.resolve(signature);
        };

        return Promise.resolve([address]);
      };
    } else {
      this.connect = () => { throw new Error('Unknown environment'); };
      return this;
    }
  }


  generateKeypair() {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    const { address, privateKey } = this.rpc.eth.accounts.create();

    return {
      address,
      privateKey,
    };
  }


  /**
   * @param {string} address Ethereum address
   *
   * @returns {Promise<string>} balance of a given address
   */
  async getBalance(address) {
    const amount = await this.rpc.eth.getBalance(address);
    return normalize(amount, -18, 18);
  }


  getGasPrice() {
    return this.rpc.eth.getGasPrice();
  }


  getNonce() {
    return this.rpc.eth.getTransactionCount(this.defaultAccount, 'pending');
  }


  async createTransaction(from, to, amount) {
    const value = normalize(amount);

    const balance = await this.getBalance(from);
    if (new BigNumber(amount).isGreaterThan(balance)) {
      throw new TransactionError('Insufficient Funds');
    }

    const [gas, gasPrice, nonce] = await Promise.all([
      this.rpc.eth.estimateGas({
        from,
        to,
        value,
        gas: this.rpc.utils.toBN('30000'),
      }),
      this.getGasPrice(),
      this.getNonce(),
    ]);

    return {
      from,
      to,
      value,
      gas,
      gasPrice,
      nonce,
      chainId: this.networkType === 'testnet' ? 3 : 1,
    };
  }


  recover(...args) {
    return this.rpc.eth.accounts.recover(...args);
  }


  recoverTransaction(...args) {
    return this.rpc.eth.accounts.recoverTransaction(...args);
  }


  async broadcastTransaction(...args) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    try {
      // const receipt = await this.rpc.eth.sendSignedTransaction(...args);
      // return receipt;
      // Uncomment the previous block and comment the next line to return the transaction receipt
      await this.rpc.eth.sendSignedTransaction(...args);
    } catch (e) {
      if (!e.message.includes('Transaction was not mined')) {
        throw new TransactionError(e);
      }
    }
    return true;
  }


  getTxStatus(transactionHash) {
    if (!this.rpc) {
      throw new Error('This function require an initialized rpc');
    }
    let i = 0;
    const backoff = () => this.rpc.eth.getTransactionReceipt(transactionHash)
      .then((receipt) => {
        if (!receipt || !receipt.status) {
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
      return 'https://ropsten.etherscan.io/';
    }
    return 'https://etherscan.io/';
  }
}


module.exports = EthereumNetwork;
