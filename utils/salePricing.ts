interface PricedItem {
  quantity?: number;
  /** Sales store the total for the whole line; repair dispatches store a unit estimate. */
  salePrice?: number;
}

interface PricedInvoice<T extends PricedItem> extends PricedItem {
  products?: T[];
  type?: string;
  totalAmount?: number;
  totalPrice?: number;
}

/** Keep stored sale totals intact and derive the rate only for presentation. */
export function getInvoicePricing<T extends PricedItem>(invoice: PricedInvoice<T>) {
  // Renderers/API readers normalize legacy single-product records before here.
  const rawItems = invoice.products ?? [];

  const sumPrices = rawItems.reduce((sum, item) => sum + (item.salePrice ?? 0), 0);
  const sumUnitPrices = rawItems.reduce(
    (sum, item) => sum + (item.salePrice ?? 0) * (item.quantity ?? 1), 0,
  );
  // Repair dispatches use unit estimates. The older repair invoice endpoint
  // instead stores line totals; its saved total identifies that format.
  const repairLineTotals = invoice.totalAmount != null &&
    Math.abs(invoice.totalAmount - sumPrices) < 0.005 &&
    Math.abs(invoice.totalAmount - sumUnitPrices) >= 0.005;
  const usesUnitPrices = invoice.type === "Repair" && !repairLineTotals;

  const items = rawItems.map(item => {
    const quantity = item.quantity ?? 1;
    const price = item.salePrice ?? 0;
    const lineTotal = usesUnitPrices ? price * quantity : price;
    const unitPrice = usesUnitPrices ? price : quantity > 0 ? price / quantity : 0;
    return { ...item, unitPrice, lineTotal };
  });

  return {
    items,
    totalAmount: invoice.totalAmount ?? invoice.totalPrice ??
      (items.length ? items.reduce((sum, item) => sum + item.lineTotal, 0) : invoice.salePrice ?? 0),
  };
}
