# Blockchain Gateway

- [Usage](#usage)
  - [Library](#library)
  - [CLI](#cli)
- [Testing and Development](#testing-and-development)

## Usage

### Library

```bash
npm install blockchain-gateway
```

```javascript
const { BitcoinNetwork } = require('blockchain-gateway');

const { BLOCKCYPHER_TOKEN, PRIVATE_KEY, TRANSFER_ADDRESS } = process.env;

// Connect to Bitcoin testnet3 with your BlockCypher Access Token
const bitcoin = new BitcoinNetwork({
  networkType: 'testnet',
  accessToken: BLOCKCYPHER_TOKEN,
});

(async () => {
  // Connect to your bitcoin account with your compressed WIF private key
  await bitcoin.connect(PRIVATE_KEY);

  // Try to send 0.5 tBTC from your account to TRANSFER_ADDRESS
  try {
    // Create a transaction and select suitable transaction outputs
    const tx = await bitcoin.createTransaction(
      bitcoin.defaultAccount,
      TRANSFER_TO,
      0.5,
    );

    // Sign the transaction inputs
    const rawTx = await bitcoin.signTransaction(tx);

    // Broadcast the raw transaction
    const txHash = await bitcoin.broadcastTransaction(rawTx);

    console.log('Your transaction was successfully broadcasted. txHash:', txHash);
  } catch (e) {
    console.log('Unable to broadcast the transaction. ', e.message);
  }
})();
```

### CLI

```bash
# Install blockchain-gateway globally
npm install -g blockchain-gateway

# Run in REPL CLI mode (https://nodejs.org/api/repl.html#repl_commands_and_special_keys)
blockchain-gateway

# Example of CLI usage
> const ethereum = new EthereumNetwork()
> ethereum.generateKeypair()
{ address: '0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738',
  privateKey:
   '0x1c98fa0487eba75ea5819850759fbba0c3ff79a811b9bdcb541a36b0fc2dd286' }
> await ethereum.connect('0x1c98fa0487eba75ea5819850759fbba0c3ff79a811b9bdcb541a36b0fc2dd286')
[ '0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738' ]
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
echo "TRANSFER_TO=$BITCOIN_RECIPIENT_ADDRESS" >> .env
echo "BTC_AMOUNT=$AMOUNT_TO_SEND" >> .env
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
node test/wallet-pkey-management

# Also you can run blockchain-gateway in CLI mode
npm run start
```
