# Demo Setup Guide: Decentralized Paystream & Escrow

This guide will walk you through setting up the Decentralized Paystream and Escrow demo on the Ethereum Sepolia Testnet. This is designed for users who may not be familiar with Ethereum or smart contract development.

## Prerequisites

### 1. Set up MetaMask
MetaMask is a browser extension that allows you to interact with the Ethereum blockchain.
1.  **Install MetaMask**: Go to [metamask.io](https://metamask.io/) and install the extension for your browser.
2.  **Create a Wallet**: Follow the instructions to create a new wallet. **Securely back up your Secret Recovery Phrase.**
3.  **Switch to Sepolia Network**: 
    *   Click the network selector at the top left of the MetaMask popup.
    *   Enable "Show test networks".
    *   Select **Sepolia**.

### 2. Get Sepolia ETH
"Gas" is required to perform transactions on Ethereum. Since this is a testnet, you can get free ETH from a faucet.
1.  Go to a faucet like [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) or [Google Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).
2.  Copy your wallet address from MetaMask (starts with `0x...`) and paste it into the faucet.
3.  Complete the verification and request ETH.

---

## Backend Configuration

### 1. Environment Variables
1.  Navigate to the root directory of the project.
2.  Create a file named `.env` and copy the content from `.env.example`.
3.  **SEPOLIA_RPC_URL**: Get an API key from [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/). It should look like `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`.
4.  **PRIVATE_KEY**: 
    *   In MetaMask, click the three dots (Account Details) and select "Export Private Key".
    *   **NEVER share this key with anyone.**
    *   Paste it into the `.env` file for the `PRIVATE_KEY` variable.

### 2. Run the Demo Setup Script
This script will deploy the smart contracts and mint test tokens for you.
1.  Open your terminal in the project root.
2.  Run the following commands:
    ```bash
    npm install
    npx hardhat run scripts/setup-demo.ts --network sepolia
    ```
3.  **Wait for the script to finish.** It will output two important addresses:
    *   `Paystream Address`
    *   `Demo USDC Address`
4.  **Copy these addresses** for the next step.

---

## Frontend Configuration

### 1. Environment Variables
1.  Navigate to the `frontend/` directory.
2.  Create a file named `.env.local`.
3.  Add the following lines, replacing the values with the addresses from the previous step:
    ```env
    NEXT_PUBLIC_CONTRACT_ADDRESS=PASTE_PAYSTREAM_ADDRESS_HERE
    NEXT_PUBLIC_RPC_URL=PASTE_SEPOLIA_RPC_URL_HERE
    ```

### 2. Update Constants
1.  Open `frontend/lib/constants.ts` and ensure `CONTRACT_ADDRESS` is pointing to your newly deployed address if you didn't use environment variables.
2.  Open `frontend/lib/tokens.ts`. Add your `Demo USDC Address` to the `WHITELISTED_TOKENS` array so it appears in the app.

---

## Running the Demo

1.  Navigate to the `frontend/` directory in your terminal.
2.  Run the following commands:
    ```bash
    npm install
    npm run dev
    ```
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.
4.  Click **Connect Wallet** and select your MetaMask account.

### Testing Tips
- **Initial Tokens**: The setup script automatically minted 10,000 `dUSDC` tokens to your wallet. You can use these to create streams or milestones.
- **Minting More**: If you are using the same account that deployed the contracts (the "Owner"), you can mint more tokens directly through the dashboard interface (if available) or by interacting with the token contract.
- **Switching Roles**: You can use different accounts in MetaMask to simulate a "Company", "Employee", or "Auditor".

---

## Troubleshooting
- **Insufficient Funds**: Make sure you have enough Sepolia ETH for gas.
- **Wrong Network**: Ensure MetaMask is set to **Sepolia**.
- **Transactions Failing**: Clear your MetaMask activity tab (Settings > Advanced > Clear activity tab data) if you encounter nonce issues.
