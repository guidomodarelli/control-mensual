export const LENDER_TYPES = ["bank", "family", "friend", "other"] as const;

export type LenderType = (typeof LENDER_TYPES)[number];

export interface LenderInput {
  id: string;
  name: string;
  notes?: string;
  type: LenderType;
}

export interface Lender extends LenderInput {
  notes?: string;
}

export interface LendersCatalogDocumentInput {
  lenders: LenderInput[];
}

export interface LendersCatalogDocument {
  lenders: Lender[];
}

function isValidLenderType(value: string): value is LenderType {
  return LENDER_TYPES.includes(value as LenderType);
}

function validateLender(
  lender: LenderInput,
  operationName: string,
): Lender {
  const normalizedLender = {
    ...lender,
    id: lender.id.trim(),
    name: lender.name.trim(),
    notes: lender.notes?.trim(),
  };

  if (!normalizedLender.id) {
    throw new Error(`${operationName} requires every lender to include an id.`);
  }

  if (!normalizedLender.name) {
    throw new Error(
      `${operationName} requires every lender to include a name.`,
    );
  }

  if (!isValidLenderType(normalizedLender.type)) {
    throw new Error(
      `${operationName} requires every lender to use a valid type.`,
    );
  }

  return {
    ...(normalizedLender.notes ? { notes: normalizedLender.notes } : {}),
    id: normalizedLender.id,
    name: normalizedLender.name,
    type: normalizedLender.type,
  };
}

export function createLendersCatalogDocument(
  payload: LendersCatalogDocumentInput,
  operationName: string,
): LendersCatalogDocument {
  const lenders = payload.lenders.map((lender) =>
    validateLender(lender, operationName),
  );
  const uniqueNames = new Set<string>();

  for (const lender of lenders) {
    const normalizedName = lender.name.toLocaleLowerCase();

    if (uniqueNames.has(normalizedName)) {
      throw new Error(
        `${operationName} requires lender names to be unique.`,
      );
    }

    uniqueNames.add(normalizedName);
  }

  return {
    lenders: [...lenders].sort((left, right) =>
      left.name.localeCompare(right.name, "en"),
    ),
  };
}

export function createEmptyLendersCatalogDocument(): LendersCatalogDocument {
  return createLendersCatalogDocument(
    {
      lenders: [],
    },
    "Creating an empty lenders catalog",
  );
}
