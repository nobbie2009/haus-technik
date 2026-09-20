import { test, expect } from "@playwright/test";
test("Updatehinweis unterscheidet Release und bereits aktualisierten Server", async ({ page }) => {
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (route) =>
    route.fulfill({ json: { tag_name: "v9.0.0" } }),
  );
  await page.goto("/");
  const button = page.getByRole("button", { name: "Version und Updates", exact: true });
  await expect(button).toContainText("Update verfügbar");
  await button.click();
  await expect(page.getByText(/Im LXC-Terminal/)).toBeVisible();
  await page.route("**/version.json", (route) => route.fulfill({ json: { version: "9.0.0" } }));
  await page.getByRole("button", { name: "Jetzt nach Updates suchen" }).click();
  await expect(page.getByText(/Die neue Version liegt bereits/)).toBeVisible();
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: "Jetzt nach Updates suchen" }).click();
  await expect(page.getByText(/Updateprüfung derzeit nicht möglich/)).toBeVisible();
});
