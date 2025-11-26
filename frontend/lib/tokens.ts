/**
 * List of common ERC20 tokens on Sepolia Testnet
 */

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logo?: string;
}

// Whitelisted tokens on Sepolia Testnet
// Note: These are commonly used test tokens. Verify addresses match your faucet/deployment
export const WHITELISTED_TOKENS: Token[] = [
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    decimals: 6,
    logo: "🟢",
  },
  {
    id: "dai",
    name: "Dai Stablecoin",
    symbol: "DAI",
    address: "0xff34B3d4aEE5D82176C1E28c29d5cc3d426eb39D",
    decimals: 18,
    logo: "🟡",
  },
  {
    id: "usdt",
    name: "Tether USD",
    symbol: "USDT",
    address: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    decimals: 6,
    logo: "🔵",
  },
];

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): Token | undefined {
  return WHITELISTED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
  return WHITELISTED_TOKENS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}

/**
 * Format token display
 */
export function formatToken(token: Token): string {
  return `${token.logo || "💰"} ${token.symbol}`;
}
