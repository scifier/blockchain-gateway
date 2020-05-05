class TransactionError extends Error {
  constructor(err) {
    if (err && err.message) {
      if (err.message.includes('User denied account authorization')) {
        super('User denied account authorization');
      } else if (err.message.includes('User denied transaction signature')) {
        super('User denied transaction signature');
      } else if (err.message.includes('Out of Gas') || err.message.includes('intrinsic gas too low')) {
        super('Gas limit too low');
      } else if (err.message.includes('insufficient funds')) {
        super('Insufficient funds');
      } else if (err.message.includes('always failing transaction')) {
        super('This transaction will fail');
      } else if (err.message.includes('transaction receipt')) {
        super('Failed to check transaction receipt. Please retry');
      } else if (err.message.includes('coderType') && err.message.includes('arg')) {
        super('Wrong arguments provided');
      } else {
        super(err.message);
      }
    } else {
      super(err);
    }

    this.status = err.status;
    this.statusText = err.statusText;
    this.name = this.constructor.name;
  }
}

module.exports = TransactionError;
