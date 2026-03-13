import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import { signIn, signOut, useSession } from "next-auth/react";
import type { ReactElement } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { StorageBootstrapResult } from "@/modules/storage/application/results/storage-bootstrap";
import HomePage from "@/pages/index";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseSession = jest.mocked(useSession);
const mockedSignIn = jest.mocked(signIn);
const mockedSignOut = jest.mocked(signOut);

function renderWithProviders(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const bootstrap: StorageBootstrapResult = {
  architecture: {
    dataStrategy: "ssr-first",
    middleendLocation: "src/modules",
    routing: "pages-router",
  },
  authStatus: "configured",
  requiredScopes: [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file",
  ],
  storageTargets: [
    {
      id: "userFiles",
      requiredScope: "https://www.googleapis.com/auth/drive.file",
      writesUserVisibleFiles: true,
    },
  ],
};

const basePageProps = {
  bootstrap,
  initialActiveTab: "expenses" as const,
  initialDocument: {
    items: [],
    month: "2026-03",
  },
  initialLendersCatalog: {
    lenders: [],
  },
  initialLoansReport: {
    entries: [],
    summary: {
      activeLoanCount: 0,
      lenderCount: 0,
      remainingAmount: 0,
      trackedLoanCount: 0,
    },
  },
  lendersLoadError: null,
  loadError: null,
  reportLoadError: null,
};

function createMockRouter() {
  return {
    isReady: true,
    pathname: "/",
    query: {},
    replace: jest.fn().mockResolvedValue(true),
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    mockedSignIn.mockReset();
    mockedSignOut.mockReset();
    mockedUseRouter.mockReturnValue(
      createMockRouter() as unknown as ReturnType<typeof useRouter>,
    );
    mockedUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);
  });

  it("renders monthly expenses content on root route", () => {
    renderWithProviders(<HomePage {...basePageProps} />);

    expect(
      screen.getByRole("tab", { name: "Gastos del mes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Detalle del mes" }),
    ).toBeInTheDocument();
  });

  it("starts Google sign in when the disconnected avatar is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(<HomePage {...basePageProps} />);

    await user.click(
      screen.getByRole("button", { name: "Conectar cuenta de Google" }),
    );

    expect(mockedSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/",
    });
  });

  it("allows disconnecting from the connected avatar menu", async () => {
    const user = userEvent.setup();

    mockedUseSession.mockReturnValue({
      data: {
        expires: "2099-01-01T00:00:00.000Z",
        user: {
          email: "gus@example.com",
          name: "Gus",
        },
      },
      status: "authenticated",
      update: jest.fn(),
    } as ReturnType<typeof useSession>);

    renderWithProviders(<HomePage {...basePageProps} />);

    await user.click(
      screen.getByRole("button", { name: "Cuenta de Google conectada" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Desconectar Google" }));

    expect(mockedSignOut).toHaveBeenCalledWith({
      callbackUrl: "/",
    });
  });
});
