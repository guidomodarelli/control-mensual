import {
  getLendersCatalogFileName,
  mapGoogleDriveLendersFileDtoToStoredCatalog,
  mapLendersCatalogToGoogleDriveFile,
  parseGoogleDriveLendersCatalogContent,
} from "./mapper";

describe("lendersGoogleDriveMapper", () => {
  it("serializes the lenders catalog into a Drive JSON file", () => {
    const result = mapLendersCatalogToGoogleDriveFile({
      lenders: [
        {
          id: "lender-1",
          name: "Banco Galicia",
          type: "bank",
        },
      ],
    });

    expect(result).toEqual({
      content: JSON.stringify(
        {
          lenders: [
            {
              id: "lender-1",
              name: "Banco Galicia",
              type: "bank",
            },
          ],
        },
        null,
        2,
      ),
      mimeType: "application/json",
      name: "lenders-catalog.json",
    });
    expect(getLendersCatalogFileName()).toBe("lenders-catalog.json");
  });

  it("parses stored Drive content into the internal lenders catalog", () => {
    const result = parseGoogleDriveLendersCatalogContent(
      JSON.stringify({
        lenders: [
          {
            id: "lender-1",
            name: "Papa",
            notes: "Tarjeta de credito",
            type: "family",
          },
        ],
      }),
      "Loading lenders catalog",
    );

    expect(result).toEqual({
      lenders: [
        {
          id: "lender-1",
          name: "Papa",
          notes: "Tarjeta de credito",
          type: "family",
        },
      ],
    });
  });

  it("maps file metadata into the stored lenders result", () => {
    expect(
      mapGoogleDriveLendersFileDtoToStoredCatalog({
        id: "lenders-file-id",
        name: "lenders-catalog.json",
      }),
    ).toEqual({
      id: "lenders-file-id",
      name: "lenders-catalog.json",
    });
  });
});
