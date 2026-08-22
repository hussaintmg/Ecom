// Shared shape + normaliser for the customer details captured on every
// invoice / credit sale. Keeping it in one place means the sell screen, the
// repair screen and the credit-sale screen all store the exact same fields,
// so the invoices table can rely on them being there.

export interface CustomerDetails {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerNote: string;
}

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Pull the customer fields out of a request body, trimmed and length-capped. */
export const normalizeCustomerDetails = (body: any): CustomerDetails => ({
  customerName: clean(body?.customerName, 120),
  customerPhone: clean(body?.customerPhone, 30),
  customerEmail: clean(body?.customerEmail, 120),
  customerAddress: clean(body?.customerAddress, 250),
  customerCity: clean(body?.customerCity, 80),
  customerNote: clean(body?.customerNote, 300),
});

/** Digits only — used to match a phone regardless of spaces/dashes typed. */
export const digitsOnly = (value: string) => (value || "").replace(/\D/g, "");
