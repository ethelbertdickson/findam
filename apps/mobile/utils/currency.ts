import type { Listing } from "../types";

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
