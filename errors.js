class BlockCypherError extends Error {
  constructor(err) {
    if (err.response && err.response.data && typeof err.response.data.error === 'string') {
      super(err.response.data.error);
    } else if (typeof err.statusText === 'string') {
      super(err.statusText);
    } else if (typeof err.message === 'string') {
      super(err.message);
    } else {
      super(err);
    }

    this.status = err.status;
    this.statusText = err.statusText;
    this.name = this.constructor.name;
  }
}

module.exports = {
  BlockCypherError,
};
