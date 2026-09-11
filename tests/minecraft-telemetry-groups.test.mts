import test from "node:test";
import assert from "node:assert/strict";
import { parseTelemetryGroups } from "../lib/minecraft/config.ts";

test("telemetry group assignments are explicit and validated", () => {
  const groups = parseTelemetryGroups({
    MINECRAFT_TELEMETRY_GROUPS:
      '{"survival-01":"survival","skyblock-01":"op-skyblock"}',
  });
  assert.equal(groups.get("survival-01"), "survival");
  assert.throws(
    () =>
      parseTelemetryGroups({
        MINECRAFT_TELEMETRY_GROUPS: '{"survival-01":"Bad Group"}',
      }),
    /group/i,
  );
  assert.throws(() => parseTelemetryGroups({}), /must define/i);
});
