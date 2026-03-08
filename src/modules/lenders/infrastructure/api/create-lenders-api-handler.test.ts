import type { NextApiRequest, NextApiResponse } from "next";
import type { drive_v3 } from "googleapis";

import { createLendersApiHandler } from "./create-lenders-api-handler";

interface MockJsonResponse {
  body: unknown | undefined;
  headers: Record<string, string>;
  statusCode: number;
}

function createMockResponse(): NextApiResponse & MockJsonResponse {
  const response: MockJsonResponse & {
    json(payload: unknown): MockJsonResponse;
    setHeader(name: string, value: string): MockJsonResponse;
    status(code: number): MockJsonResponse;
  } = {
    body: undefined,
    headers: {},
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
    setHeader(name: string, value: string) {
      response.headers[name] = value;
      return response;
    },
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    statusCode: 200,
  };

  return response as unknown as NextApiResponse & MockJsonResponse;
}

describe("createLendersApiHandler", () => {
  it("returns 200 with the lenders catalog when the request is GET", async () => {
    const driveClient = {} as drive_v3.Drive;
    const handler = createLendersApiHandler({
      get: jest.fn().mockResolvedValue({
        lenders: [
          {
            id: "lender-1",
            name: "Banco Galicia",
            type: "bank",
          },
        ],
      }),
      getDriveClient: jest.fn().mockResolvedValue(driveClient),
      save: jest.fn(),
    });

    const request = {
      method: "GET",
    } as NextApiRequest;
    const response = createMockResponse();

    await handler(request, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      data: {
        lenders: [
          {
            id: "lender-1",
            name: "Banco Galicia",
            type: "bank",
          },
        ],
      },
    });
  });

  it("returns 201 when the catalog is saved", async () => {
    const driveClient = {} as drive_v3.Drive;
    const save = jest.fn().mockResolvedValue({
      id: "lenders-file-id",
      name: "lenders-catalog.json",
    });
    const handler = createLendersApiHandler({
      get: jest.fn(),
      getDriveClient: jest.fn().mockResolvedValue(driveClient),
      save,
    });

    const request = {
      body: {
        lenders: [
          {
            id: "lender-1",
            name: "Banco Galicia",
            type: "bank",
          },
        ],
      },
      method: "POST",
    } as NextApiRequest;
    const response = createMockResponse();

    await handler(request, response);

    expect(save).toHaveBeenCalledWith({
      command: {
        lenders: [
          {
            id: "lender-1",
            name: "Banco Galicia",
            type: "bank",
          },
        ],
      },
      driveClient,
      request,
    });
    expect(response.statusCode).toBe(201);
  });
});
