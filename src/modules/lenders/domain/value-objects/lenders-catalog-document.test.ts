import {
  createLendersCatalogDocument,
} from "./lenders-catalog-document";

describe("lendersCatalogDocument", () => {
  it("normalizes lenders and sorts them by name", () => {
    const result = createLendersCatalogDocument(
      {
        lenders: [
          {
            id: "lender-2",
            name: "  Papa  ",
            notes: "  Tarjeta Visa  ",
            type: "family",
          },
          {
            id: "lender-1",
            name: "Banco Galicia",
            type: "bank",
          },
        ],
      },
      "Saving lenders catalog",
    );

    expect(result).toEqual({
      lenders: [
        {
          id: "lender-1",
          name: "Banco Galicia",
          type: "bank",
        },
        {
          id: "lender-2",
          name: "Papa",
          notes: "Tarjeta Visa",
          type: "family",
        },
      ],
    });
  });

  it("rejects duplicate lender names", () => {
    expect(() =>
      createLendersCatalogDocument(
        {
          lenders: [
            {
              id: "lender-1",
              name: "Banco Galicia",
              type: "bank",
            },
            {
              id: "lender-2",
              name: " banco galicia ",
              type: "bank",
            },
          ],
        },
        "Saving lenders catalog",
      ),
    ).toThrow("Saving lenders catalog requires lender names to be unique.");
  });
});
