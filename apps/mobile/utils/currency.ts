import type { Listing } from "../types";
import type { CurrencyCode } from "../types";

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "NGN", label: "Nigerian Naira" },
  { code: "USD", label: "US Dollar" },
  { code: "GBP", label: "British Pound" },
  { code: "EUR", label: "Euro" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "ZAR", label: "South African Rand" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "KES", label: "Kenyan Shilling" },
];

export function formatCurrency(value: number, currencyCode: CurrencyCode = "NGN") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
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
