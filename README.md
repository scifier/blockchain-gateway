# Blockchain Gateway

- [Usage](#usage)
- [Testing and Development](#testing-and-development)

## Usage

```bash
# Install project
git clone https://github.com/scifier/blockchain-gateway.git
cd blockchain-gateway
npm install

# Run in REPL CLI mode (https://nodejs.org/api/repl.html#repl_commands_and_special_keys)
npm run start

# Example of CLI usage
> new EthereumNetwork().generateKeypair()
{
  address: '0xa71F7F4611BA0c6E836671210a97DCD2DCcF1738',
  privateKey: '0x1c98fa0487eba75ea5819850759fbba0c3ff79a811b9bdcb541a36b0fc2dd286'
}
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
```
