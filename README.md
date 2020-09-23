# Blockchain Gateway

[![npm version](https://badge.fury.io/js/blockchain-gateway.svg)](https://badge.fury.io/js/blockchain-gateway)

- [Usage](#usage)
  - [Library](#library)
  - [CLI](#cli)
- [Testing and Development](#testing-and-development)

## Usage

### Library

```bash
npm install blockchain-gateway
```

Sending Bitcoin transactions is pretty easy. You don't need to deal with UTXOs and computing fees:

```javascript
const { BitcoinNetwork } = require('blockchain-gateway');

const { BLOCKCYPHER_TOKEN, PRIVATE_KEY } = process.env;

// Connect to Bitcoin testnet3 with your BlockCypher Access Token
const bitcoin = new BitcoinNetwork({
  networkType: 'testnet',
  accessToken: BLOCKCYPHER_TOKEN,
});

(async () => {
  // Connect to your Bitcoin account with your compressed WIF private key
  await bitcoin.connect(PRIVATE_KEY);

  // Generate a random Bitcoin account
  const { address } = ethereum.generateKeypair();

  // Try to send 0.5 tBTC from your account to the generated account
  try {
    // Compute fees and select suitable transaction outputs
    const tx = await bitcoin.createTransaction(
      bitcoin.defaultAccount,
      address,
      0.5,
    );

    // Sign the transaction inputs
    const { rawTx, txHash } = await bitcoin.signTransaction(tx);
    console.log('Your transaction was successfully signed. txHash:', txHash);

    // Broadcast the raw transaction
    await bitcoin.broadcastTransaction(rawTx);

    // Check if the transaction has at least 1 confirmation
    await bitcoin.getTxStatus(txHash);
    console.log('Your transaction was successfully mined!', bitcoin.getTxLink(txHash));
  } catch (e) {
    console.log('Something went wrong!', e.message);
  }
})();
```

Ethereum transactions are sent in the same way:

```javascript
import { EthereumNetwork } from 'blockchain-gateway';
// or import EthereumNetwork from 'blockchain-gateway/EthereumNetwork';

const { INFURA_PROJECT_ID, PRIVATE_KEY } = process.env;

// Connect to Ethereum mainnet with your Infura Project Id
const ethereum = new EthereumNetwork({
  networkType: 'mainnet',
  accessToken: INFURA_PROJECT_ID,
});

(async () => {
  // Connect to your Ethereum account with your private key
  await ethereum.connect(PRIVATE_KEY);

  // Generate a random Ethereum account
  const { address } = ethereum.generateKeypair();

  // Try to send 0.5 ETH from your account to the generated account
  try {
    // Compute fees and fetch the nonce
    const tx = await ethereum.createTransaction(
      ethereum.defaultAccount,
      address,
      0.5,
    );

    // Sign the transaction
    const { rawTx, txHash } = await ethereum.signTransaction(tx);
    console.log('Your transaction was successfully signed. txHash:', txHash);

    // Broadcast the raw transaction
    await ethereum.broadcastTransaction(rawTx);

    // Check if the transaction was mined
    await ethereum.getTxStatus(txHash);
    console.log('Your transaction was successfully mined!', ethereum.getTxLink(txHash));
  } catch (e) {
    console.log('Something went wrong!', e.message);
  }
})();
```

Also, signing Ethereum transactions using MetaMask is also supported. You don't have to pass the `accessToken` to the `EthereumNetwork` constructor if you are using a browser with installed MetaMask.

### CLI

```bash
# Install blockchain-gateway globally
npm install -g blockchain-gateway

# Run in REPL CLI mode (https://nodejs.org/api/repl.html#repl_commands_and_special_keys)
blockchain-gateway

# Example of CLI usage
> const ethereum = new EthereumNetwork({ accessToken: 'YOUR_INFURA_PROJECT_ID' })
> ethereum.generateKeypair()
{ address: '0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738',
  privateKey: '0x1c98fa0487eba75ea5819850759fbba0c3ff79a811b9bdcb541a36b0fc2dd286' }
> await ethereum.getBalance('0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738')
'0'
> await ethereum.connect('0x1c98fa0487eba75ea5819850759fbba0c3ff79a811b9bdcb541a36b0fc2dd286')
[ '0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738' ]
> await ethereum.createTransaction('0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738', '0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738', '0.5')
Uncaught TransactionError: Insufficient Funds
  at Proxy.createTransaction (/Users/user/.nvm/versions/node/v12.18.3/lib/node_modules/blockchain-gateway/EthereumNetwork.js:216:13)
  at processTicksAndRejections (internal/process/task_queues.js:97:5)
```

## Testing and Development

```bash
# Install project
git clone https://github.com/scifier/blockchain-gateway.git
cd blockchain-gateway
npm install

# Prepare your testing environment
echo "BLOCKCYPHER_TOKEN=$YOUR_BLOCKCYPHER_TOKEN" > .env
echo "INFURA_TOKEN=$YOUR_INFURA_PROJECT_ID" >> .env
echo "NETWORK_TYPE=mainnet" >> .env
# Variables required by test/bitcoin-transactions
echo "BTC_PRIVATE_KEY=$COMPRESSED_WIF_PRIVATE_KEY" >> .env
echo "BTC_ADDRESS=$BITCOIN_RECIPIENT_ADDRESS" >> .env
echo "BTC_AMOUNT=$BTC_AMOUNT_TO_SEND" >> .env
# Variables required by test/ethereum-transactions
echo "ETH_PRIVATE_KEY=$ETHEREUM_PRIVATE_KEY" >> .env
echo "ETH_ADDRESS=$ETHEREUM_RECIPIENT_ADDRESS" >> .env
echo "ETH_AMOUNT=$ETH_AMOUNT_TO_SEND" >> .env
# KMS variables are required by test/wallet-pkey-management
echo "KMS_KEY_ARN=$KMS_KEY_ARN" >> .env
echo "KMS_ACCESS_KEY=$KMS_ACCESS_KEY" >> .env
echo "KMS_SECRET_KEY=$KMS_SECRET_KEY" >> .env
echo "KMS_ENCRYPTION_KEY=$KMS_ENCRYPTION_KEY" >> .env
echo "KMS_REGION=$KMS_REGION" >> .env

# Run tests
npm run test

# Run specific test
node test/bitcoin-transactions
node test/ethereum-transactions
node test/wallet-pkey-management

# Also you can run blockchain-gateway in CLI mode
npm run start
```

## Authors

- **Niţa Radu** - *Initial work* - [scifier](https://github.com/scifier)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
