import type { Listing } from "../types";
import type { CurrencyCode } from "../types";

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
];

export function formatCurrency(value: number, currencyCode: CurrencyCode = "NGN") {
  const symbols: Record<CurrencyCode, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$", ZAR: "R", GHS: "GH₵", KES: "KSh" };
  return `${symbols[currencyCode] ?? currencyCode}${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}`;
}

export function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function formatAmountInput(value: string | number) {
  const digits = digitsOnly(String(value));
  return digits ? Number(digits).toLocaleString("en-NG") : "";
}

export function parseAmountInput(value: string) {
  return Number(digitsOnly(value));
}

export function getAgencyFee(listing: Listing) {
  const property = listing.propertyDetails;
  if (!property) return 0;
  const fee = Number(property.agencyFee || 0);
  return property.agencyFeeType === "PERCENTAGE"
    ? listing.price * (fee / 100)
    : fee;
}
