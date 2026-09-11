import test from "node:test";
import assert from "node:assert/strict";
import { getWikiReaderMetrics, hashWikiReaderIdentity, recordWikiHeartbeat, recordWikiOpen } from "../lib/wiki/readers.ts";

test("wiki reader identities are stable without storing the anonymous token", () => {
  const first = hashWikiReaderIdentity({ visitorId: "visitor-123" });
  assert.equal(first, hashWikiReaderIdentity({ visitorId: "visitor-123" }));
  assert.notEqual(first, hashWikiReaderIdentity({ userId: 123 }));
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("opening a published wiki page increments its durable reader row", async () => {
  const calls: Array<{ sql: string; values?: unknown }> = [];
  const result = await recordWikiOpen(7, { userId: 3 }, new Date("2026-08-12T08:00:00.000Z"), {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (calls.length === 1) return [[{ id: 7 }], undefined] as const;
      return [[{ total_opens: 12, unique_readers: 8, active_readers: 2 }], undefined] as const;
    },
    execute: async (sql, values) => { calls.push({ sql, values }); return [{ affectedRows: 1 }, undefined] as const; }
  });
  assert.match(calls[1]?.sql ?? "", /open_count\s*=\s*open_count\s*\+\s*1/i);
  assert.match(calls[0]?.sql ?? "", /deleted_at IS NULL/i);
  assert.deepEqual(result, { totalOpens: 12, uniqueReaders: 8, activeReaders: 2 });
});

test("heartbeat refreshes presence without incrementing total opens", async () => {
  let heartbeatSql = "";
  await recordWikiHeartbeat(7, { visitorId: "anon" }, new Date("2026-08-12T08:00:00.000Z"), {
    query: async (_sql, _values) => [[{ total_opens: 4, unique_readers: 3, active_readers: 1 }], undefined] as const,
    execute: async (sql) => { heartbeatSql = String(sql); return [{ affectedRows: 1 }, undefined] as const; }
  });
  assert.match(heartbeatSql, /last_heartbeat\s*=\s*VALUES\(last_heartbeat\)/i);
  assert.match(heartbeatSql, /deleted_at IS NULL/i);
  assert.doesNotMatch(heartbeatSql, /open_count\s*=\s*open_count\s*\+/i);
  assert.match(heartbeatSql, /,\s*0,\s*\?,\s*\?,\s*\?/i);
});

test("reader metrics use a sixty second active window", async () => {
  let values: unknown[] = [];
  const metrics = await getWikiReaderMetrics(5, new Date("2026-08-12T08:00:00.000Z"), {
    query: async (_sql, params) => { values = params as unknown[]; return [[{ total_opens: "9", unique_readers: "6", active_readers: "2" }], undefined] as const; },
    execute: async () => [{}, undefined] as const
  });
  assert.deepEqual(values, [new Date("2026-08-12T07:59:00.000Z"), 5]);
  assert.deepEqual(metrics, { totalOpens: 9, uniqueReaders: 6, activeReaders: 2 });
});
