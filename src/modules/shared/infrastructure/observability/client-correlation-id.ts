let fallbackSequence = 0;

function getGlobalCrypto() {
  if (typeof globalThis === "undefined") {
    return undefined;
  }

  return globalThis.crypto;
}

export function generateCorrelationId(): string {
  const cryptoApi = getGlobalCrypto();

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  fallbackSequence += 1;
  return `cid-${Date.now().toString(36)}-${fallbackSequence}`;
}

export function withCorrelationIdHeaders(
  headers?: HeadersInit,
  correlationId: string = generateCorrelationId(),
): Headers {
  const normalizedHeaders = new Headers(headers);

  if (!normalizedHeaders.has("x-correlation-id")) {
    normalizedHeaders.set("x-correlation-id", correlationId);
  }

  return normalizedHeaders;
}