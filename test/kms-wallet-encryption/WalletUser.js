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
   * @param {object} [options]
   * @param {object} [options.decimalPlaces]
   * @param {string} [options.currency] 'BTC', 'ETH' or 'GABY'
   * @param {boolean} [options.extended] include info about tokens and unconfirmed txs
   */
  async getBalance(options = {}) {
    const decimals = (typeof options.decimalPlaces === 'number') ? options.decimalPlaces : 4;

    if (typeof options.currency === 'string') {
      if (options.currency.toUpperCase() === 'BTC') {
        if (options.extended) {
          return this.wallets.btcWallet.getBalance({ includeAddressInfo: true })
            .then((btcWalletInfo) => ({
              ethBalance: normalize(btcWalletInfo.balance, -8, decimals < 8 ? decimals : 8),
              btcWalletInfo,
            }));
        }
        return this.wallets.btcWallet.getBalance()
          .then((amount) => normalize(amount, -8, decimals < 8 ? decimals : 8));
      }
      if (options.currency.toUpperCase() === 'ETH') {
        if (options.extended) {
          return this.wallets.ethWallet.getBalance({ includeAddressInfo: true })
            .then((ethWalletInfo) => ({
              ethBalance: normalize(ethWalletInfo.balance, -18, decimals < 18 ? decimals : 18),
              ethWalletInfo,
            }));
        }
        return this.wallets.ethWallet.getBalance()
          .then((amount) => normalize(amount, -18, decimals < 18 ? decimals : 18));
      }
      if (options.currency.toUpperCase() === 'GABY') {
        return this.wallets.ethWallet.getBalance({ token: 'GABY' })
          .then((amount) => normalize(amount, -18, decimals < 18 ? decimals : 18));
      }
    }

    if (!options.extended) {
      const [ethBalance, gabyBalance, btcBalance] = await Promise.all([
        this.wallets.ethWallet.getBalance()
          .then((amount) => normalize(amount, -18, decimals < 18 ? decimals : 18)),
        this.wallets.ethWallet.getBalance({ token: 'GABY' })
          .then((amount) => normalize(amount, -18, decimals < 18 ? decimals : 18)),
        this.wallets.btcWallet.getBalance()
          .then((amount) => normalize(amount, -8, decimals < 8 ? decimals : 8)),
      ]);

      return {
        ethBalance,
        gabyBalance,
        btcBalance,
      };
    }

    const [ethWalletInfo, btcWalletInfo, gabyBalance] = await Promise.all([
      this.wallets.ethWallet.getBalance({ includeAddressInfo: true }),
      this.wallets.btcWallet.getBalance({ includeAddressInfo: true }),
      this.wallets.ethWallet.getBalance({ token: 'GABY' }),
    ]);

    return {
      ethBalance: normalize(ethWalletInfo.balance, -18, decimals < 18 ? decimals : 18),
      ethWalletInfo,
      gabyBalance: normalize(gabyBalance, -18, decimals < 18 ? decimals : 18),
      tokens: ethWalletInfo.tokens,
      btcBalance: normalize(btcWalletInfo.finalBalance, -8, decimals < 8 ? decimals : 8),
      btcWalletInfo,
    };
  }


  getTokenHoldingUrl() {
    return this.wallets.ethWallet.getTokenHoldingUrl();
  }


  async createTransaction({
    receiver, // regular and token tx
    currency, // regular and token tx
    amount, // regular and token tx
    tokenDenomination, // token tx
    contractAddress, // token tx and complex tx
    contractAbi, // complex tx
    functionName, // complex tx
    functionArgs, // complex tx
  }) {
    if (typeof currency === 'string') {
      if (currency.toUpperCase() === 'BTC') {
        return this.wallets.btcWallet.createTransaction({ receiver, amount });
      }
      return this.wallets.ethWallet.createTransaction({
        receiver, // regular and token tx
        currency, // regular and token tx
        amount, // regular and token tx
        tokenDenomination, // token tx
        contractAddress, // token tx and complex tx
        contractAbi, // complex tx
        functionName, // complex tx
        functionArgs, // complex tx
      });
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
