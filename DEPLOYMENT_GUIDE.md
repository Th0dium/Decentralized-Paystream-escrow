# Deployment Guide for Updated Paystream Contract

## Changes Made

✅ **Updated Paystream.sol** to whitelist tokens for both **Mainnet** and **Sepolia Testnet**

### Mainnet Tokens (Already whitelisted):
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- DAI: `0x6B175474E89094C44Da98b954EedeAC495271d0F`

### Sepolia Testnet Tokens (Now whitelisted):
- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- USDT: `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`
- DAI: `0xFF34B3d4Aee5D82176c1e28C29d5CC3d426eB39D`

## Deployment Steps

### Step 1: Compile the Updated Contract
```bash
npx hardhat compile
```

### Step 2: Deploy to Sepolia
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Or if you have a deploy script:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Step 3: Update Environment Variables
After deployment, update `frontend/.env.local` with the new contract address:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<NEW_CONTRACT_ADDRESS>
```

### Step 4: Verify on Etherscan (Optional)
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Benefits of This Update

✅ **No more manual whitelisting** - Sepolia tokens are auto-whitelisted on deployment
✅ **Supports both Mainnet and Testnet** - Single contract works everywhere
✅ **Ready to use immediately** - No additional setup needed after deploy
✅ **Matches token configuration** - All tokens in `frontend/lib/tokens.ts` are supported

## Testing the Deployment

1. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to payment creation**:
   ```
   http://localhost:3000/dashboard/company/create-stream
   ```

3. **Create a payment**:
   - Select any token (USDC, USDT, or DAI)
   - No warning banner should appear
   - Transaction should succeed (if you have tokens and gas)

## Important Notes

- Replace the old contract address in your environment
- The new contract is fully backward compatible
- All existing functions work the same way
- Only the constructor was modified

## Rollback (if needed)

If you need to revert to the old contract:
1. Restore `contracts/Paystream.sol` from git history
2. Redeploy the old version
3. Update the contract address in environment variables
