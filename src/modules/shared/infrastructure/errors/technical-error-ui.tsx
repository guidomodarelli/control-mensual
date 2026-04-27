import type { ReactNode } from "react";

import type { TechnicalErrorCode } from "./technical-error-codes";

export function renderErrorWithCode(
  message: string,
  errorCode?: TechnicalErrorCode | null,
): ReactNode {
  if (!errorCode) {
    return message;
  }

  return (
    <span>
      <span>{message}</span>
      <br />
      <small>{`Code: ${errorCode}`}</small>
    </span>
  );
}
