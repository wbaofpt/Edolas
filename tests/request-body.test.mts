import test from "node:test";
import assert from "node:assert/strict";
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from "../lib/minecraft/request-body.ts";

test("bounded body reader rejects streamed data above the hard cap", async () => {
  const request = new Request("https://edolas.test/upload", {
    method: "POST",
    body: "x".repeat(1025),
  });
  await assert.rejects(
    () => readRequestBody(request, 1024),
    RequestBodyTooLargeError,
  );
});

test("bounded body reader accepts content within the hard cap", async () => {
  const request = new Request("https://edolas.test/upload", {
    method: "POST",
    body: "safe-body",
  });
  assert.equal(await readRequestBody(request, 1024), "safe-body");
});
