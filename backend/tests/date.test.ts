import { test } from "node:test";
import assert from "node:assert/strict";
process.env.APP_TIMEZONE = "America/Sao_Paulo";
const { schoolDate } = await import("../src/services/dateService.js");
test("dia escolar usa America/Sao_Paulo nas bordas da meia-noite UTC", () => {
  assert.equal(
    schoolDate(new Date("2026-11-04T02:59:59Z")).toISOString(),
    "2026-11-03T00:00:00.000Z",
  );
  assert.equal(
    schoolDate(new Date("2026-11-04T03:00:00Z")).toISOString(),
    "2026-11-04T00:00:00.000Z",
  );
});
