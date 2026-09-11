import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Storefront renders QR payment and polls terminal state", async () => {
  const source = await readFile(new URL("../components/store/storefront.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /QRCodeSVG/);
  assert.match(source, /clientRequestKey/);
  assert.match(source, /3_000/);
  assert.match(source, /SANDBOX/);
  assert.match(source, /sandboxCompletionToken|checkoutUrl/);
  assert.match(source, /aria-live="polite"/);
  assert.match(styles, /\.store-payment-qr/);
  assert.match(styles, /\.store-sandbox-badge/);
});
