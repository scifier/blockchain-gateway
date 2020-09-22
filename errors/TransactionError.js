class TransactionError extends Error {
  constructor(err) {
    if (err && err.message) {
      if (err.message.includes('User denied account authorization')) {
        super('User denied account authorization');
      } else if (err.message.includes('User denied transaction signature')) {
        super('User denied transaction signature');
      } else if (err.message.includes('Out of Gas')
      || err.message.includes('intrinsic gas too low') || err.message.includes('gas limit is too low')) {
        super('Gas limit too low');
      } else if (err.message.includes('insufficient funds')) {
        super('Insufficient funds');
      } else if (err.message.includes('always failing transaction')) {
        super('This transaction will fail');
      } else if (err.message.includes('transaction receipt')) {
        super('Failed to check transaction receipt. Please retry');
      } else if (err.message.includes('Transaction was not mined')) {
        super('This transaction was not mined yet, please make sure your transaction was properly sent. Be aware that it might still be mined!');
      } else if (err.message.includes('known transaction') || err.message.includes('already known')) {
        super('This transaction is already sent');
      } else if (err.message.includes('replacement transaction underpriced')) {
        super('Replacement transaction is underpriced');
      } else if (err.message.includes('nonce too low')) {
        super('Nonce too low. Please retry');
      } else if (err.message.includes('exceeds block gas limit')) {
        super('Block gas limit exceeded. Please retry');
      } else if (err.message.includes('coderType') && err.message.includes('arg')) {
        super('Wrong arguments provided');
      } else {
        super(err.message);
      }
    } else {
      super(err);
    }

    if (err.status) {
      this.status = err.status;
    }
    if (err.statusText) {
      this.statusText = err.statusText;
    }
    this.name = this.constructor.name;
  }
}

module.exports = TransactionError;
