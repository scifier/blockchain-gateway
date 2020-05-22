/**
 * Class representing a blockchain wallet
 *
 * @property {string} address wallet address
 * @method getBalance
 * @method createTransaction
 * @method signTransaction
 * @method broadcastTransaction
 */
class BlockchainWallet {
  /**
   * @param {object} wallet
   * @param {string} wallet.address
   * @param {string} wallet.privateKey encryptedPrivateKey
   * @param {object} wallet.blockchain
   * @param {object} wallet.keyManager
   *
   * @returns {BlockchainWallet}
   */
  constructor(wallet) {
    const { privateKey, blockchain, keyManager } = wallet;
    this.address = wallet.address;
    Object.defineProperty(this, 'protocol', { value: blockchain.protocol });

    /**
     * @function
     */
    this.getBalance = (options) => blockchain.getBalance(this.address, options);

    /**
     * @function
     *
     * @param {object} transaction
     * @param {string} transaction.receiver regular and token tx
     * @param {string} [transaction.currency] regular and token tx
     * @param {string} transaction.amount regular and token tx
     * @param {number} [transaction.tokenDenomination] token tx
     * @param {string} [transaction.contractAddress] token tx and complex tx
     * @param {Array<*>} [transaction.contractAbi] complex tx
     * @param {string} [transaction.functionName] complex tx
     * @param {Array<*>} [transaction.functionArgs] complex tx
     *
     * @returns {{tx: object, protocol: string}}
     */
    this.createTransaction = async (transaction = {}) => {
      const tx = await blockchain.createTransaction({
        sender: this.address,
        ...transaction,
      });
      return {
        tx,
        protocol: this.protocol,
      };
    };

    /**
     * @function
     *
     * @param {object} transaction result of this.createTransaction
     * @param {object} transaction.tx
     *
     * @returns {{tx: object, rawTx: string, protocol: string}}
     */
    this.signTransaction = async (transaction = {}) => {
      const pkey = await keyManager.decrypt(privateKey);
      const rawTx = await blockchain.signTransaction(transaction.tx, pkey);
      return {
        ...transaction,
        rawTx,
        protocol: this.protocol,
      };
    };

    /**
     * @function
     *
     * @param {object} transaction result of this.createTransaction
     * @param {object} [transaction.tx]
     * @param {object} transaction.rawTx
     *
     * @returns {{tx: object, rawTx: string, txHash: string, txLink: string, protocol: string}}
     */
    this.broadcastTransaction = async (transaction = {}) => {
      const txHash = await blockchain.broadcastTransaction(transaction.rawTx);
      return {
        ...transaction,
        txHash,
        txLink: blockchain.getTxLink(txHash),
        protocol: this.protocol,
      };
    };

    return this;
  }


  /**
   * Will create a wallet (does not return private key!)
   */
  static async create({ blockchain, keyManager }) {
    const { address, privateKey } = blockchain.generateKeypair();
    const ecryptedPrivateKey = await keyManager.encrypt(privateKey);
    return new BlockchainWallet({
      address,
      privateKey: ecryptedPrivateKey,
      blockchain,
      keyManager,
    });
  }
}

module.exports = BlockchainWallet;
