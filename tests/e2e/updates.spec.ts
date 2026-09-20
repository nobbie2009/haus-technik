import { test, expect } from "@playwright/test";
test("Updatehinweis unterscheidet Release und bereits aktualisierten Server", async ({ page }) => {
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (route) =>
    route.fulfill({ json: { tag_name: "v9.0.0" } }),
  );
  await page.goto("/");
  const button = page.getByRole("button", { name: "Version und Updates", exact: true });
  await expect(button).toContainText("Update verfügbar");
  await button.click();
  await expect(page.getByText(/Installiere sie hier/)).toBeVisible();
  await page.route("**/version.json", (route) => route.fulfill({ json: { version: "9.0.0" } }));
  await page.getByRole("button", { name: "Jetzt nach Updates suchen" }).click();
  await expect(page.getByText(/Die neue Version liegt bereits/)).toBeVisible();
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: "Jetzt nach Updates suchen" }).click();
  await expect(page.getByText(/Updateprüfung derzeit nicht möglich/)).toBeVisible();
});

test("Update direkt aus der App: Passwort prüfen, Fortschritt und neue Serverversion", async ({ page }) => {
  let state = "idle";
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (r) =>
    r.fulfill({ json: { tag_name: "v9.0.0" } }),
  );
  await page.route("**/api/home-technik-update", async (route) => {
    if (route.request().method() === "POST") {
      if (route.request().postDataJSON().password !== "correct-password")
        return route.fulfill({ status: 401, json: { message: "Update-Passwort ist nicht korrekt." } });
      expect(route.request().headers()["x-home-technik-update"]).toBe("1");
      state = "running";
      return route.fulfill({ status: 202, json: { state, message: "Update gestartet" } });
    }
    return route.fulfill({
      json: { supported: true, state, message: state === "success" ? "Update abgeschlossen." : "Bereit" },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Version und Updates", exact: true }).click();
  await page.getByLabel("Update-Passwort", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Update installieren", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Update-Passwort ist nicht korrekt.");
  await page.getByLabel("Update-Passwort", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Update installieren", exact: true }).click();
  await expect(page.getByRole("button", { name: "Update läuft …", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Update-Passwort", { exact: true })).toHaveValue("");
  await page.route("**/version.json", (r) => r.fulfill({ json: { version: "9.0.0" } }));
  state = "success";
  await expect(page.getByRole("button", { name: "Neue Version laden", exact: true })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("contentinfo", { name: "App-Version und Copyright" })).toContainText(
    "Copyright by nobbie2009",
  );
});
