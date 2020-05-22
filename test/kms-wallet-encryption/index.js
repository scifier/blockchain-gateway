require('dotenv').config();
const { BitcoinNetwork, EthereumNetwork } = require('../..');
const BlockchainWallet = require('./BlockchainWallet');
const WalletUser = require('./WalletUser');
const kms = require('./kms');

const networkType = process.env.NETWORK_TYPE || 'testnet';

const ethereum = new EthereumNetwork({ networkType });
const bitcoin = new BitcoinNetwork({ networkType });

module.exports = (async () => {
  const ethWallet = ethereum.generateKeypair();
  console.log(`========== Random Ethereum account generated ==========
    address:    ${ethWallet.address}
    privateKey: ${ethWallet.privateKey}
  `);
  ethWallet.privateKey = await kms.encrypt(ethWallet.privateKey);
  console.log(`========== Private key encrypted ==========
    privateKey: ${ethWallet.privateKey}
  `);

  const btcWallet = bitcoin.generateKeypair();
  console.log(`========== Random Bitcoin account generated ==========
    address:    ${btcWallet.address}
    privateKey: ${btcWallet.privateKey}
  `);
  btcWallet.privateKey = await kms.encrypt(btcWallet.privateKey);
  console.log(`========== Private key encrypted ==========
    privateKey: ${btcWallet.privateKey}
  `);

  console.log(new WalletUser({
    ethWallet: new BlockchainWallet({
      ...ethWallet,
      blockchain: ethereum,
      keyManager: kms,
    }),
    btcWallet: new BlockchainWallet({
      ...btcWallet,
      blockchain: bitcoin,
      keyManager: kms,
    }),
  }));
})();
