/**
 * Centralizes allowed receipt upload formats and limits for monthly expenses.
 *
 * @module receipt-upload.constants
 */

/**
 * Lists accepted MIME types for receipt files.
 */
export const RECEIPT_UPLOAD_ACCEPT_MIME_TYPES = [
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Exposes accepted MIME types as a comma-separated string for file inputs.
 */
export const RECEIPT_UPLOAD_ACCEPT_ATTRIBUTE =
  RECEIPT_UPLOAD_ACCEPT_MIME_TYPES.join(",");

/**
 * Defines the maximum allowed receipt file size in bytes.
 */
export const RECEIPT_UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Provides helper text describing accepted extensions and size limits.
 */
export const RECEIPT_UPLOAD_HINT_TEXT =
  "PDF, JPG, PNG, WEBP, HEIC o HEIF (hasta 5MB).";
