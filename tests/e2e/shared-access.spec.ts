import { test } from "@playwright/test";
import { checkSharedAccess } from "../sharedAccessBrowser";
test("Projektschlüssel auf eigenem Gerät merken und entfernen", async ({ page, context }) =>
  checkSharedAccess(page, context));
