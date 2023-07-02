# Pull-Payment Marketplace Contract
A generic pull-payment marketplace where registered vendors can receive customer payments in ETH or whitelisted ERC-20s. The contract owner can define a fee in basis points charged on each purchase and a recipient address to receive them.

## Functions

### Owner Functions
- `registerVendor(uint256 _vendorId, address _vendorAddress)`: Registers a vendor's payment address.

- `updateVendorAddress(uint256 _vendorId, address _newVendorAddress)`: Updates a vendor's payment address.

- `updateFeeBasisPoints(uint256 _newFeeBasisPoints)`: Updates the market fee in basis points.

- `updateFeeRecipient(address _newFeeRecipient)`: Updates the market fee recipient.

- `addToWhitelist(address _token)`: Adds a token to the whitelist, allowing it to be used for purchases.

- `removeFromWhitelist(address _token)`: Removes a token from the whitelist.

### User Functions
- `purchaseWithERC20(uint256 _vendorId, uint256 _orderId, uint256 _amount, address _token)`: Makes a purchase using an ERC20 token.

- `purchaseWithEther(uint256 _vendorId, uint256 _orderId)`: Makes a purchase using Ether.

- `withdrawTokens(address _token, address _payee)`: Based on withdrawPayment, allows anyone to withdraw a users ERC20 tokens to the users wallet.

## Installation
This project requires [nodejs](https://nodejs.org/en/) with npm. Clone the repository, navigate to the directory and run:

```bash
npm install
```

The copy the contents of the `sample.env` file to a `.env` file with working credentials.

## Testing
Run tests using the following command:

```bash
npx hardhat test
```

## Development
To compile, run:
```bash
npx hardhat compile
```

## Deployment
This contract is prepared for deployment on Ethereum using Hardhat. Fill the .env file with your credentials. Then run:

```bash
npx hardhat run scripts/deploy.js --network <network>
```

Replace `<network>` with your desired network. The project currently supports: `localhost`, `hardhat`, `goerli`, `mainnet`

## Etherscan Verify
To verify on Etherscan:

```bash
npx hardhat verify --network <network> <deployed_contract_address> 100 "<deployer_wallet_address>"
```
Replace:  
`<network>` with your desired network  
`<deployed_contract_address>` with the address of the deployed contract  
`<deployer_wallet_address>` with the address of the wallet that deployed the contract.  
