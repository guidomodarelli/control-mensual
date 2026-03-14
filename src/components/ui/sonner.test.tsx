import { render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";

import { Toaster } from "./sonner";

jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedSonner = jest.fn(() => <div data-testid="sonner" />);

jest.mock("sonner", () => ({
  Toaster: (props: unknown) => mockedSonner(props),
}));

describe("Toaster", () => {
  beforeEach(() => {
    mockedSonner.mockClear();
  });

  it("uses resolved dark theme when available", () => {
    mockedUseTheme.mockReturnValue({
      forcedTheme: undefined,
      resolvedTheme: "dark",
      setTheme: jest.fn(),
      systemTheme: "dark",
      theme: "system",
      themes: ["light", "dark"],
    });

    render(<Toaster />);

    expect(screen.getByTestId("sonner")).toBeInTheDocument();
    expect(mockedSonner).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "dark" }),
    );
  });

  it("falls back to light when theme values are not resolved", () => {
    mockedUseTheme.mockReturnValue({
      forcedTheme: undefined,
      resolvedTheme: undefined,
      setTheme: jest.fn(),
      systemTheme: undefined,
      theme: "system",
      themes: ["light", "dark"],
    });

    render(<Toaster />);

    expect(screen.getByTestId("sonner")).toBeInTheDocument();
    expect(mockedSonner).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "light" }),
    );
  });
});
