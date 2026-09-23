import { test, expect } from "@playwright/test";

test("Z2M über Home Assistant lesen, platzieren, manuell scannen und stoppen", async ({ page }) => {
  const first = "0x0000000000000001",
    second = "0x0000000000000002";
  let scans = 0;
  await page.addInitScript(() =>
    localStorage.setItem(
      "home-technik.home-assistant.connection.v1",
      JSON.stringify({ url: "http://ha.example.test:8123", token: "test-token" }),
    ),
  );
  await page.routeWebSocket("ws://ha.example.test:8123/api/websocket", (ws) => {
    const send = (topic: string, payload: unknown) =>
      ws.send(
        JSON.stringify({
          id: 1,
          type: "event",
          event: { topic: `zigbee2mqtt/${topic}`, payload: JSON.stringify(payload), retain: false },
        }),
      );
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
      else if (msg.type === "mqtt/subscribe") {
        ws.send(JSON.stringify({ id: msg.id, type: "result", success: true, result: null }));
        send("bridge/devices", [
          {
            ieee_address: first,
            friendly_name: "Router Flur",
            type: "Router",
            definition: { model: "Beispielrouter", vendor: "Demo" },
          },
          {
            ieee_address: second,
            friendly_name: "Sensor Garten",
            type: "EndDevice",
            definition: { model: "Beispielsensor", vendor: "Demo" },
          },
        ]);
        send("Sensor Garten", { linkquality: 60, battery: 85 });
      } else if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong", id: msg.id }));
      else if (msg.type === "call_service") {
        scans++;
        const payload = JSON.parse(msg.service_data.payload);
        ws.send(JSON.stringify({ type: "result", id: msg.id, success: true, result: null }));
        send("bridge/response/networkmap", {
          status: "ok",
          transaction: payload.transaction,
          data: {
            type: "raw",
            value: {
              nodes: [],
              links: [
                {
                  source: { ieeeAddr: first },
                  target: { ieeeAddr: second },
                  lqi: 60,
                  depth: 1,
                  relationship: 1,
                  routes: [],
                },
              ],
            },
          },
        });
      }
    });
    ws.send(JSON.stringify({ type: "auth_required" }));
  });
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByRole("button", { name: "Zigbee2MQTT · Geräte & Karte", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Zigbee2MQTT im Hausplan", exact: true });
  await dialog.getByLabel("Anzeige aktualisieren", { exact: true }).selectOption("5");
  await dialog.getByRole("button", { name: "Geräte auslesen & Live starten", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Platzieren: Router Flur", exact: true })).toBeVisible();
  expect(scans).toBe(0);
  await dialog.getByRole("button", { name: "Platzieren: Router Flur", exact: true }).click();
  let box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 260, box.y + 230);
  await page.getByRole("button", { name: "Zigbee2MQTT · Live aktiv", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Zigbee2MQTT im Hausplan", exact: true });
  await dialog.getByRole("button", { name: "Platzieren: Sensor Garten", exact: true }).click();
  box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 490, box.y + 400);
  await page.getByRole("button", { name: "Zigbee2MQTT · Live aktiv", exact: true }).click();
  await dialog.getByRole("button", { name: "Topologie jetzt scannen", exact: true }).click();
  expect(scans).toBe(1);
  await expect(dialog.getByRole("status")).toContainText("Empfang aktiv");
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  if (!(await page.getByLabel("Zigbee-Planname", { exact: true }).isVisible()))
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await expect(page.getByText("Gemeldete Funkverbindungen (1)", { exact: true })).toBeVisible();
  await expect(page.getByText(/Geräte-LQI: 60/)).toBeVisible({ timeout: 12000 });
  await page.screenshot({ path: "test-results/zigbee-desktop.png" });
  await page.getByRole("button", { name: "Zigbee-Aktualisierung stoppen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Zigbee2MQTT · Geräte & Karte", exact: true })).toBeVisible();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByRole("button", { name: "Zigbee2MQTT · Geräte & Karte", exact: true }).click();
  await expect(page.getByRole("button", { name: "Im Plan auswählen", exact: true })).toHaveCount(2);
  expect(scans).toBe(1);
});
