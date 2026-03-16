import { z } from "zod";

const PAYMENT_LINK_PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const PAYMENT_LINK_URL_SCHEMA = z.url({
  protocol: /^https?$/,
  hostname: z.regexes.domain,
});

export const PAYMENT_LINK_VALIDATION_ERROR_MESSAGE =
  "Ingresá un link válido con dominio (por ejemplo, ejemplo.com).";

export function normalizePaymentLink(value: string): string {
  const normalizedValue = value.trim();
  const paymentLinkWithProtocol = PAYMENT_LINK_PROTOCOL_PATTERN.test(
    normalizedValue,
  )
    ? normalizedValue
    : `https://${normalizedValue}`;

  return PAYMENT_LINK_URL_SCHEMA.parse(paymentLinkWithProtocol);
}

export function isValidPaymentLink(value: string): boolean {
  try {
    normalizePaymentLink(value);
    return true;
  } catch {
    return false;
  }
}

export function getValidPaymentLink(value: string): string | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  try {
    return normalizePaymentLink(normalizedValue);
  } catch {
    return null;
  }
}
