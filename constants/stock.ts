// Shared guard rails for manual stock adjustments.
// A single manual entry beyond MAX_STOCK_CHANGE is almost always a typo
// (an extra zero), so the API rejects it outright.
export const MAX_STOCK_CHANGE = 100000;

// Above this, the dashboards ask for an explicit confirmation before sending.
export const LARGE_STOCK_CHANGE = 500;

// Or when the entry is this many times bigger than the stock already on hand.
export const LARGE_STOCK_MULTIPLIER = 10;

/**
 * Should the UI double-check this quantity with the user before saving?
 * Catches the two common mistakes: an extra digit, and a quantity wildly out
 * of proportion with what the product normally holds.
 */
export const isSuspiciousStockChange = (amount: number, currentStock: number) => {
  const qty = Math.abs(amount);
  if (qty >= LARGE_STOCK_CHANGE) return true;
  if (currentStock > 0 && qty >= currentStock * LARGE_STOCK_MULTIPLIER) return true;
  return false;
};
