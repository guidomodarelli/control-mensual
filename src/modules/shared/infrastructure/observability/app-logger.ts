import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

const MAX_SANITIZE_DEPTH = 5;
const MAX_STRING_LENGTH = 2_000;
const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /token|secret|authorization|cookie|password|credential|api[_-]?key|refresh/i;
const HIGH_RISK_PAYLOAD_KEY_PATTERN = /body|content|headers|payload|query/i;

type LogLevel = "error" | "info" | "warn";

export interface AppLogOptions {
  context?: Record<string, unknown>;
  error?: unknown;
}

type RequestForLogging = Pick<IncomingMessage, "headers" | "method" | "url">;
const correlationIdsByRequest = new WeakMap<object, string>();

function getSingleHeaderValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getExistingCorrelationId(request?: RequestForLogging) {
  const correlationIdHeader = getSingleHeaderValue(
    request?.headers?.["x-correlation-id"],
  );

  if (correlationIdHeader) {
    return correlationIdHeader;
  }

  const requestIdHeader = getSingleHeaderValue(request?.headers?.["x-request-id"]);

  if (requestIdHeader) {
    return requestIdHeader;
  }

  return getSingleHeaderValue(request?.headers?.["x-vercel-id"]);
}

function getOrCreateCorrelationId(request?: RequestForLogging) {
  const existingCorrelationId = getExistingCorrelationId(request);

  if (existingCorrelationId) {
    return existingCorrelationId;
  }

  if (!request) {
    return undefined;
  }

  const cachedCorrelationId = correlationIdsByRequest.get(request);

  if (cachedCorrelationId) {
    return cachedCorrelationId;
  }

  const newCorrelationId = randomUUID();
  correlationIdsByRequest.set(request, newCorrelationId);

  return newCorrelationId;
}

function sanitizeString(value: string) {
  const withoutBearer = value.replace(
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    "Bearer [REDACTED]",
  );
  const withoutTokenValues = withoutBearer.replace(
    /(access_token|refresh_token|client_secret|authorization)=([^&\s]+)/gi,
    "$1=[REDACTED]",
  );

  if (withoutTokenValues.length <= MAX_STRING_LENGTH) {
    return withoutTokenValues;
  }

  return `${withoutTokenValues.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
}

function sanitizeValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (depth >= MAX_SANITIZE_DEPTH) {
    return "[TRUNCATED]";
  }

  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    const errorMetadata: Record<string, unknown> = {
      message: sanitizeString(value.message),
      name: value.name,
      stack: sanitizeString(value.stack ?? ""),
    };
    const errorAsRecord = value as Error & Record<string, unknown>;
    const allowedErrorKeys = [
      "apiStatus",
      "code",
      "errorCode",
      "endpoint",
      "httpStatus",
      "operation",
      "status",
    ] as const;

    for (const key of allowedErrorKeys) {
      const propertyValue = errorAsRecord[key];

      if (propertyValue !== undefined) {
        errorMetadata[key] = sanitizeValue(propertyValue, depth + 1, seen);
      }
    }

    if ("cause" in errorAsRecord && errorAsRecord.cause !== undefined) {
      errorMetadata.cause = sanitizeValue(errorAsRecord.cause, depth + 1, seen);
    }

    return errorMetadata;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);

    const source = value as Record<string, unknown>;
    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, propertyValue] of Object.entries(source)) {
      if (
        SENSITIVE_KEY_PATTERN.test(key) ||
        HIGH_RISK_PAYLOAD_KEY_PATTERN.test(key)
      ) {
        sanitizedObject[key] = REDACTED_VALUE;
        continue;
      }

      sanitizedObject[key] = sanitizeValue(propertyValue, depth + 1, seen);
    }

    seen.delete(value);

    return sanitizedObject;
  }

  return String(value);
}

function cleanUndefinedValues(
  context: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}

function emit(level: LogLevel, message: string, options?: AppLogOptions) {
  const payload: Record<string, unknown> = {
    level,
    message: sanitizeString(message),
    timestamp: new Date().toISOString(),
  };

  if (options?.context) {
    payload.context = sanitizeValue(options.context);
  }

  if (options?.error !== undefined) {
    payload.error = sanitizeValue(options.error);
  }

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export function createRequestLogContext(request?: RequestForLogging) {
  const requestId =
    getSingleHeaderValue(request?.headers?.["x-request-id"]) ??
    getSingleHeaderValue(request?.headers?.["x-vercel-id"]);
  const correlationId = getOrCreateCorrelationId(request);

  return cleanUndefinedValues({
    correlationId,
    requestId,
    requestMethod: request?.method,
    requestPath: request?.url,
  });
}

export const appLogger = {
  error(message: string, options?: AppLogOptions) {
    emit("error", message, options);
  },
  info(message: string, options?: AppLogOptions) {
    emit("info", message, options);
  },
  warn(message: string, options?: AppLogOptions) {
    emit("warn", message, options);
  },
};
