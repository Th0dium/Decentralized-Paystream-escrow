# Token Whitelist Guide

Since you can't access the contract write functions on Etherscan (unverified contract), follow these steps:

## Option 1: Run Hardhat Script (Recommended)

This script is already created at `scripts/whitelist-token.ts`

### Quick Start:
1. **Open PowerShell or Command Prompt** in your project root directory (`c:\Dev\Decentralized-Paystream-escrow`)
2. **Run the following command**:
   ```
   npx hardhat run scripts/whitelist-token.ts --network sepolia
   ```

The script will:
- Connect to your Sepolia contract at `0x55225ca36FF331838223194E8Edac30BA5B0600c`
- Call `updateTokenWhitelist()` to whitelist USDC (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`)
- Verify the token is now whitelisted
- Display the transaction hash and confirmation block

### If you get "npm not found" error:
Try one of these commands instead:
```
# Using yarn (if installed)
yarn hardhat run scripts/whitelist-token.ts --network sepolia

# Using pnpm (if installed)
pnpm hardhat run scripts/whitelist-token.ts --network sepolia

# Or use node directly
node node_modules/hardhat/dist/hardhat.js run scripts/whitelist-token.ts --network sepolia
```

---

## Option 2: Verify Contract on Sepolia Etherscan

If you prefer using Etherscan's write interface instead, follow these steps:

### Step 1: Flatten the Contract
Since Paystream.sol imports OpenZeppelin contracts, we need to flatten it.

1. Install Hardhat flattener (if not already installed):
   ```bash
   npm install --save-dev hardhat-flatten
   ```

2. Flatten the contract:
   ```bash
   npx hardhat flatten contracts/Paystream.sol > Paystream.flat.sol
   ```

### Step 2: Verify on Etherscan Sepolia

1. Go to: https://sepolia.etherscan.io/address/0x55225ca36FF331838223194E8Edac30BA5B0600c#code

2. Click "Verify and Publish" under the Contract Code section

3. Fill in the verification form:
   - **Contract Address**: `0x55225ca36FF331838223194E8Edac30BA5B0600c`
   - **Compiler Type**: Single File
   - **Compiler Version**: `v0.8.30+commit.c626dd86` (must match Paystream.sol line 2)
   - **License**: MIT
   - **Optimization**: Yes, 200 runs (matches hardhat.config.ts)

4. Copy the entire flattened contract source code from `Paystream.flat.sol` into the code field

5. For Constructor Arguments, use the ABI encoding of empty constructor:
   - Just click "Verify and Publish" without constructor args (constructor has no parameters)

6. Click "Verify and Publish"

7. Once verified, go back to the contract page and scroll to "Write Contract"

8. Click "Connect to Web3" and connect your wallet (the account that deployed the contract)

9. Find the `updateTokenWhitelist` function and fill in:
   - **token (address)**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
   - **whitelisted (bool)**: `true`

10. Click "Write" and confirm the transaction in Phantom wallet

---

## What Each Option Does

Both options call the same smart contract function with the same parameters:
```solidity
function updateTokenWhitelist(address token, bool whitelisted) external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Token Address (Sepolia USDC)**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
**Action**: Set to `true` to whitelist

After whitelisting, the `createPayment()` function will accept USDC as payment.

---

## Verify It Worked

After whitelisting, check on Etherscan:
1. Navigate to: https://sepolia.etherscan.io/address/0x55225ca36FF331838223194E8Edac30BA5B0600c#readContract
2. Find `isTokenWhitelisted` under "Read Contract"
3. Enter the USDC address: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
4. Click "Query" - it should return `true`

---

## Next Step: Test Payment Creation

Once the token is whitelisted, you can test creating a payment through your UI at:
`http://localhost:3000/dashboard/company/create-stream`

The transaction should now succeed!
