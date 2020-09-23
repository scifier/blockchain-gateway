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
     * @param {string} transaction.receiver
     * @param {string} [transaction.currency]
     * @param {string} transaction.amount
     *
     * @returns {{tx: object, protocol: string}}
     */
    this.createTransaction = async (transaction = {}) => {
      const sender = this.address;
      const { receiver, amount } = transaction;
      const tx = await blockchain.createTransaction(sender, receiver, amount);
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
     * @returns {{tx: object, rawTx: string, txHash: string, txLink: string, protocol: string}}
     */
    this.signTransaction = async (transaction = {}) => {
      const pkey = await keyManager.decrypt(privateKey);
      await blockchain.connect(pkey);
      const { rawTx, txHash } = await blockchain.signTransaction(transaction.tx, pkey);
      return {
        ...transaction,
        rawTx,
        txHash,
        txLink: blockchain.getTxLink(txHash),
        protocol: this.protocol,
      };
    };

    /**
     * @function
     *
     * @param {object} transaction result of this.signTransaction
     * @param {object} [transaction.tx]
     * @param {object} transaction.rawTx
     * @param {object} [transaction.txHash]
     * @param {object} [transaction.txLink]
     *
     * @returns {{tx: object, rawTx: string, txHash: string, txLink: string, protocol: string}}
     */
    this.broadcastTransaction = async (transaction = {}) => {
      await blockchain.broadcastTransaction(transaction.rawTx);
      return {
        ...transaction,
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
    const encryptedPrivateKey = await keyManager.encrypt(privateKey);
    return new BlockchainWallet({
      address,
      privateKey: encryptedPrivateKey,
      blockchain,
      keyManager,
    });
  }
}

module.exports = BlockchainWallet;
