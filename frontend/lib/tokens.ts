/**
 * List of common ERC20 tokens on Sepolia testnet
 */

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logo?: string;
}

// Common tokens on Sepolia testnet
export const SEPOLIA_TOKENS: Token[] = [
  {
    id: "weth",
    name: "Wrapped Ethereum",
    symbol: "wETH",
    address: "0xfFf9976782d46CC05630D1855593f8925d0D49D6",
    decimals: 18,
    logo: "🔵",
  },
  {
    id: "usdc",
    name: "USDC Stablecoin",
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    logo: "🟢",
  },
  {
    id: "dai",
    name: "DAI Stablecoin",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    logo: "🟡",
  },
  {
    id: "usdt",
    name: "USDT Stablecoin",
    symbol: "USDT",
    address: "0xdac17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    logo: "🟢",
  },
  {
    id: "wbtc",
    name: "Wrapped Bitcoin",
    symbol: "wBTC",
    address: "0x2260fac5e5542a773aa44fbcff9fac6820186d3d",
    decimals: 8,
    logo: "🟠",
  },
  {
    id: "wsol",
    name: "Wrapped Solana",
    symbol: "wSOL",
    address: "0xD31a59c85aE9d8eDefec411D448f90541b5FFd18",
    decimals: 9,
    logo: "🟣",
  },
];

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): Token | undefined {
  return SEPOLIA_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
  return SEPOLIA_TOKENS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}

/**
 * Format token display
 */
export function formatToken(token: Token): string {
  return `${token.logo || "💰"} ${token.symbol}`;
}
