import assert from "node:assert/strict";
import test from "node:test";
import { createGmailSender } from "../lib/auth/email-sender.ts";

test("Gmail sender normalizes the App Password and sends branded HTML and text", async () => {
  let transportOptions: unknown;
  let deliveredMessage: Record<string, unknown> | undefined;
  const sender = createGmailSender(
    {
      user: "accounts@edolassg.com",
      appPassword: "abcd efgh ijkl mnop",
      fromName: "EdolasSG"
    },
    (options) => {
      transportOptions = options;
      return {
        async sendMail(message) {
          deliveredMessage = message;
        }
      };
    }
  );

  await sender({ to: "player@example.com", code: "481205" });

  assert.deepEqual(transportOptions, {
    service: "gmail",
    auth: { user: "accounts@edolassg.com", pass: "abcdefghijklmnop" }
  });
  assert.equal(deliveredMessage?.to, "player@example.com");
  assert.equal(deliveredMessage?.subject, "Mã xác nhận EdolasSG: 481205");
  assert.match(String(deliveredMessage?.text), /481205/);
  assert.match(String(deliveredMessage?.html), /481205/);
  assert.match(String(deliveredMessage?.html), /10 phút/);
});

