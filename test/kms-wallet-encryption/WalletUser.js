const { normalize } = require('../../utils');
const BlockchainWallet = require('./BlockchainWallet');


class WalletUser {
  constructor(wallets) {
    this.wallets = wallets;
    return this;
  }


  /**
   * @param {string} currency Currency or network protocol (e.g. 'BTC', 'ethereum')
   *
   * @returns {string|object} wallet address or object if no currency provided
   */
  getAddress(currency) {
    if (typeof currency !== 'string') {
      return {
        ethWalletAddress: this.wallets.ethWallet.address,
        btcWalletAddress: this.wallets.btcWallet.address,
      };
    }
    if (currency.toUpperCase() === 'BTC' || currency.toLowerCase() === 'bitcoin') {
      return this.wallets.btcWallet.address;
    }
    return this.wallets.ethWallet.address;
  }


  /**
   * Get wallets' balances
   *
   * @param {string} currency 'BTC' or 'ETH'
   *
   * @returns {string|object} selected currency balance or an object with both balances
   */
  async getBalance(currency) {
    if (typeof currency === 'string') {
      if (currency.toUpperCase() === 'BTC') {
        return this.wallets.btcWallet.getBalance();
      }
      if (currency.toUpperCase() === 'ETH') {
        return this.wallets.ethWallet.getBalance();
      }
      throw new Error('Currently BTC and ETH currencies are supported only');
    }
    const [ethBalance, btcBalance] = await Promise.all([
      this.wallets.ethWallet.getBalance(),
      this.wallets.btcWallet.getBalance(),
    ]);
    return {
      ethBalance,
      btcBalance,
    };
  }


  async createTransaction({ receiver, currency, amount }) {
    if (typeof currency === 'string') {
      if (currency.toUpperCase() === 'BTC') {
        return this.wallets.btcWallet.createTransaction({ receiver, amount });
      }
      if (currency.toUpperCase() === 'ETH') {
        return this.wallets.ethWallet.createTransaction({ receiver, amount });
      }
      throw new Error('Currently BTC and ETH currencies are supported only');
    }
    throw new Error('Currency is not provided');
  }


  async signTransaction({ tx, protocol }) {
    if (protocol === 'bitcoin') {
      return this.wallets.btcWallet.signTransaction({ tx });
    }
    return this.wallets.ethWallet.signTransaction({ tx });
  }


  async broadcastTransaction({ tx, rawTx, protocol }) {
    if (protocol === 'bitcoin') {
      return this.wallets.btcWallet.broadcastTransaction({ tx, rawTx });
    }
    return this.wallets.ethWallet.broadcastTransaction({ tx, rawTx });
  }


  /**
   * Will create user with wallets (does not return private keys!)
   */
  static async create({ networks, keyManager }) {
    const [ethWallet, btcWallet] = await Promise.all([
      BlockchainWallet.create({ blockchain: networks.ethereum, keyManager }),
      BlockchainWallet.create({ blockchain: networks.bitcoin, keyManager }),
    ]);
    return new WalletUser({
      ethWallet,
      btcWallet,
    });
  }
}


module.exports = WalletUser;
