import { test } from "@playwright/test";
import { checkSharedAccess } from "../sharedAccessBrowser";
test("iPhone-Breite: Zugang nach Tabwechsel erhalten", async ({ page, context }) =>
  checkSharedAccess(page, context));
