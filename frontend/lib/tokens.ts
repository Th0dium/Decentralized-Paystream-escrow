/**
 * List of common ERC20 tokens on Mainnet
 */

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logo?: string;
}

// Whitelisted tokens on Mainnet
export const WHITELISTED_TOKENS: Token[] = [
  {
    id: "usdc",
    name: "USD Coin",
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    logo: "🟢",
  },
  {
    id: "dai",
    name: "Dai Stablecoin",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    logo: "🟡",
  },
  {
    id: "usdt",
    name: "Tether USD",
    symbol: "USDT",
    address: "0xdac17F958D2ee523a2206206994597C13D831ec7",
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
