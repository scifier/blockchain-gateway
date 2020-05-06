# Blockchain Gateway

- [Usage](#usage)

## Usage

```bash
# Install project
git clone https://github.com/scifier/blockchain-gateway.git
cd blockchain-gateway
npm install

# Prepare your environment
echo "BLOCKCYPHER_TOKEN=$YOUR_ACCESS_TOKEN" > .env
echo "NETWORK_TYPE=mainnet" >> .env
echo "SENDER_WIF=$COMPRESSED_WIF_PRIVATE_KEY" >> .env
echo "AMOUNT=$AMOUNT_TO_SEND" >> .env
echo "RECIPIENT_ADDRESS=$RECIPIENT_ADDRESS" >> .env

# Run the project (will create and broadcast an $AMOUNT_TO_SEND transaction to $RECIPIENT_ADDRESS)
npm run start
```
