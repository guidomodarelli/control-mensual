import { z } from "zod";

import {
  type TechnicalErrorCode,
  isTechnicalErrorCode,
} from "./technical-error-codes";

const technicalErrorEnvelopeSchema = z.object({
  error: z.string().trim().min(1),
  errorCode: z.string().trim().regex(/^E\d{4}$/),
}).strict();

const legacyErrorEnvelopeSchema = z.object({
  error: z.string().trim().min(1),
}).strict();

export interface TechnicalErrorEnvelope {
  error: string;
  errorCode: TechnicalErrorCode;
}

export interface ParsedTechnicalError {
  error: string;
  errorCode: TechnicalErrorCode | null;
}

export class TechnicalApiError extends Error {
  readonly errorCode: TechnicalErrorCode | null;

  constructor(
    message: string,
    options?: ErrorOptions & {
      errorCode?: TechnicalErrorCode | null;
    },
  ) {
    super(message, options);
    this.name = "TechnicalApiError";
    this.errorCode = options?.errorCode ?? null;
  }
}

export function createTechnicalErrorEnvelope(
  error: string,
  errorCode: TechnicalErrorCode,
): TechnicalErrorEnvelope {
  return {
    error,
    errorCode,
  };
}

export function parseTechnicalErrorResponse(responseJson: unknown): ParsedTechnicalError | null {
  const technicalEnvelope = technicalErrorEnvelopeSchema.safeParse(responseJson);

  if (technicalEnvelope.success) {
    return {
      error: technicalEnvelope.data.error,
      errorCode: technicalEnvelope.data.errorCode as TechnicalErrorCode,
    };
  }

  const legacyEnvelope = legacyErrorEnvelopeSchema.safeParse(responseJson);

  if (!legacyEnvelope.success) {
    return null;
  }

  return {
    error: legacyEnvelope.data.error,
    errorCode: null,
  };
}

export function getTechnicalErrorCode(error: unknown): TechnicalErrorCode | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const maybeErrorCode = (error as Error & { errorCode?: unknown }).errorCode;

  return isTechnicalErrorCode(maybeErrorCode) ? maybeErrorCode : null;
}
