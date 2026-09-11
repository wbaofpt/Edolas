import test from "node:test";
import assert from "node:assert/strict";
import { validateControlMutation } from "../lib/control/guard.ts";

test("control mutations require same origin and a matching CSRF token", () => {
  const base = new Request("https://edolas.vn/api/control/users/2", { method: "PATCH", headers: { origin: "https://edolas.vn", host: "edolas.vn", cookie: "edolas_control_csrf=csrf", "x-control-csrf": "csrf" } });
  assert.deepEqual(validateControlMutation(base), { ok: true, csrfToken: "csrf" });
  assert.equal(validateControlMutation(new Request(base.url,{method:"PATCH",headers:{origin:"https://evil.vn",host:"edolas.vn",cookie:"edolas_control_csrf=csrf","x-control-csrf":"csrf"}})).ok,false);
  assert.equal(validateControlMutation(new Request(base.url,{method:"PATCH",headers:{origin:"https://edolas.vn",host:"edolas.vn",cookie:"edolas_control_csrf=a","x-control-csrf":"b"}})).ok,false);
});
