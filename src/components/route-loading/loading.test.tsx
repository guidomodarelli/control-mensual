import { act, render, screen } from "@testing-library/react";
import { useRouter } from "next/router";

import { Loading } from "./loading";

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);

type RouteHandler = (url: string) => void;

function createRouterEvents() {
  const handlers = new Map<string, Set<RouteHandler>>();

  return {
    emit(eventName: string, url: string) {
      handlers.get(eventName)?.forEach((handler) => handler(url));
    },
    off(eventName: string, handler: RouteHandler) {
      handlers.get(eventName)?.delete(handler);
    },
    on(eventName: string, handler: RouteHandler) {
      const eventHandlers = handlers.get(eventName) ?? new Set<RouteHandler>();

      eventHandlers.add(handler);
      handlers.set(eventName, eventHandlers);
    },
  };
}

function mockRouter(asPath = "/gastos") {
  const events = createRouterEvents();

  mockedUseRouter.mockReturnValue({
    asPath,
    events,
  } as unknown as ReturnType<typeof useRouter>);

  return events;
}

describe("Loading", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    mockedUseRouter.mockReset();
  });

  it("shows loading on first entry and hides it after the initial loading window", () => {
    mockRouter("/cotizaciones");

    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando sección...");

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows loading when navigating to another section", () => {
    const events = mockRouter("/cotizaciones");

    render(<Loading />);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    act(() => {
      events.emit("routeChangeStart", "/gastos");
    });

    expect(screen.getByRole("status")).toHaveTextContent("Cargando sección...");

    act(() => {
      events.emit("routeChangeComplete", "/gastos");
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not show loading when navigating inside the same section", () => {
    const events = mockRouter("/gastos?month=2026-05");

    render(<Loading />);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    act(() => {
      events.emit("routeChangeStart", "/gastos?month=2026-06");
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
