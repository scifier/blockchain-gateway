#!/bin/sh
":" // ; exec /usr/bin/env node --experimental-repl-await "$0"

const repl = require('repl');

const BitcoinNetwork = require('../BitcoinNetwork');
const EthereumNetwork = require('../EthereumNetwork');

const r = repl.start('> ');

Object.defineProperties(r.context, {
  BitcoinNetwork: { configurable: false, enumerable: true, value: BitcoinNetwork },
  EthereumNetwork: { configurable: false, enumerable: true, value: EthereumNetwork },
});
