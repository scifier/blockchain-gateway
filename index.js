const BitcoinNetwork = require('./BitcoinNetwork');
const EthereumNetwork = require('./EthereumNetwork');

if (!module.parent) {
  // eslint-disable-next-line global-require
  const repl = require('repl');

  const r = repl.start('> ');
  Object.defineProperties(r.context, {
    BitcoinNetwork: { configurable: false, enumerable: true, value: BitcoinNetwork },
    EthereumNetwork: { configurable: false, enumerable: true, value: EthereumNetwork },
  });
} else {
  module.exports = {
    BitcoinNetwork,
    EthereumNetwork,
  };
}
