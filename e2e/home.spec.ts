import { expect, test } from "@playwright/test";

test("renders monthly expenses on root route", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("tab", { name: "Gastos del mes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Detalle del mes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conectar cuenta de Google" }),
  ).toBeVisible();
});
