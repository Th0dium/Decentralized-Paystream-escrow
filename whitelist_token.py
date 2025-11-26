#!/usr/bin/env python3
"""
Whitelist USDC token on Sepolia Paystream contract using Web3.py
"""

import json
import os
from web3 import Web3

# Configuration
RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/xEdjPWL3Yc6MaDLNA1VWr"
CONTRACT_ADDRESS = "0x55225ca36FF331838223194E8Edac30BA5B0600c"
TOKEN_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
PRIVATE_KEY = "8adf874d1c763748e5bf5e9072f40c38dd7cbfbd362704b4812ca5c17f4050ae"

# Minimal Paystream ABI with updateTokenWhitelist function
PAYSTREAM_ABI = [
    {
        "type": "function",
        "name": "updateTokenWhitelist",
        "inputs": [
            {"name": "token", "type": "address"},
            {"name": "whitelisted", "type": "bool"}
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "isTokenWhitelisted",
        "inputs": [{"name": "", "type": "address"}],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view"
    }
]

def main():
    print("🔐 Whitelisting USDC token on Sepolia...")
    print(f"Contract: {CONTRACT_ADDRESS}")
    print(f"Token: {TOKEN_ADDRESS}")

    # Connect to Web3
    w3 = Web3(Web3.HTTPProvider(RPC_URL))

    if not w3.is_connected():
        print("❌ Failed to connect to Sepolia RPC")
        return False

    print("✅ Connected to Sepolia RPC")

    # Get account from private key
    account = w3.eth.account.from_key(PRIVATE_KEY)
    print(f"📍 Using account: {account.address}")

    # Get contract instance
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=PAYSTREAM_ABI)

    # Check current whitelist status
    print("\n🔍 Checking current whitelist status...")
    is_whitelisted = contract.functions.isTokenWhitelisted(TOKEN_ADDRESS).call()
    print(f"Token currently whitelisted: {is_whitelisted}")

    if is_whitelisted:
        print("✅ Token is already whitelisted! No action needed.")
        return True

    # Get gas estimate
    print("\n📊 Estimating gas...")
    try:
        gas_estimate = contract.functions.updateTokenWhitelist(
            TOKEN_ADDRESS, True
        ).estimate_gas({"from": account.address})
        print(f"Estimated gas: {gas_estimate}")
    except Exception as e:
        print(f"⚠️  Gas estimation failed: {e}")
        gas_estimate = 100000

    # Get current gas price
    gas_price = w3.eth.gas_price
    print(f"Current gas price: {w3.from_wei(gas_price, 'gwei')} gwei")

    # Build transaction
    print("\n📝 Building transaction...")
    tx_data = contract.functions.updateTokenWhitelist(
        TOKEN_ADDRESS, True
    ).build_transaction({
        "from": account.address,
        "gas": gas_estimate,
        "gasPrice": gas_price,
        "nonce": w3.eth.get_transaction_count(account.address),
    })

    # Sign transaction
    print("🔏 Signing transaction...")
    signed_tx = w3.eth.account.sign_transaction(tx_data, PRIVATE_KEY)

    # Send transaction
    print("📤 Sending transaction...")
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print(f"✅ Transaction sent!")
    print(f"📋 Hash: {tx_hash.hex()}")

    # Wait for receipt
    print("⏳ Waiting for transaction confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt.status == 1:
        print(f"✅ Transaction confirmed in block {receipt.blockNumber}")
        print(f"💨 Gas used: {receipt.gasUsed}")

        # Verify whitelist status
        print("\n🔍 Verifying whitelist status...")
        is_whitelisted = contract.functions.isTokenWhitelisted(TOKEN_ADDRESS).call()

        if is_whitelisted:
            print("✅ SUCCESS! USDC token is now whitelisted on Sepolia!")
            print("\n🎉 You can now create payment streams with USDC!")
            return True
        else:
            print("❌ Error: Token is still not whitelisted")
            return False
    else:
        print(f"❌ Transaction failed in block {receipt.blockNumber}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
