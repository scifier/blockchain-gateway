const BigNumber = require('bignumber.js');


/**
 * normalize(0.1, 18)                   = 100000000000000000 (0.1 ETH in wei)
 * normalize(0.1, 8)                    = 10000000           (0.1 BTC in Satoshi)
 * normalize('100000000000000000', -18) = 0.1                (from wei to ETH)
 * normalize(0.12345678, 0, 4)          = 0.1234             (truncate decimals)
 * @param  {string|number} amount
 * @param  {string|number} exponent default = 18
 * @param  {number} decimalPlaces default = 18
 * @param  {string} type default = 'string' ('bignumber'|'string'|'number')
 * @return {*} the type of returned value is choosen by 'type' argument
 */
function normalize(amount, exponent = 18, decimalPlaces = 18, type = 'string') {
  BigNumber.config({
    EXPONENTIAL_AT: 1e+9,
    ROUNDING_MODE: BigNumber.ROUND_FLOOR,
  });

  const result = new BigNumber(amount).times(
    new BigNumber(10).pow(exponent),
  ).decimalPlaces(decimalPlaces);

  switch (type) {
    case 'bignumber': return result;
    case 'number': return result.toNumber();
    default: return String(result);
  }
}


/**
 * Delay a Promise chain execution
 *
 * @param {Number} duration time in ms
 */
function delay(duration = 500) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}


module.exports = {
  normalize,
  delay,
};
