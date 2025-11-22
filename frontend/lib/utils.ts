/**
 * Utility functions for the Paystream frontend
 */

/**
 * Format an Ethereum address for display
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Convert wei to token amount
 */
export function formatTokenAmount(
  weiAmount: string | bigint,
  decimals: number = 18
): string {
  const amount = BigInt(weiAmount);
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmed = fractionalStr.replace(/0+$/, "");

  return `${wholePart}.${trimmed}`;
}

/**
 * Convert token amount to wei
 */
export function parseTokenAmount(
  tokenAmount: string,
  decimals: number = 18
): string {
  const amount = parseFloat(tokenAmount);
  const wei = BigInt(Math.floor(amount * Math.pow(10, decimals)));
  return wei.toString();
}

/**
 * Format a date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date and time for display
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Validate an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(
  value: string | bigint | number,
  percentage: number,
  decimals: number = 18
): string {
  const amount = BigInt(value);
  const bps = Math.floor(percentage * 100); // Convert to basis points
  const result = (amount * BigInt(bps)) / BigInt(10000);
  return formatTokenAmount(result, decimals);
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  current: string | bigint,
  total: string | bigint
): number {
  const curr = BigInt(current);
  const tot = BigInt(total);

  if (tot === BigInt(0)) return 0;

  return Math.floor(Number((curr * BigInt(100)) / tot));
}

/**
 * Format currency (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}
