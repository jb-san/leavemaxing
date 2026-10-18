const base = process.env.WORKER_URL ?? "ws://localhost:8787";

const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
const randomId = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const hashSecret = async (secret) =>
  b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))));

function fail(reason) {
  console.error(`smoke failed: ${reason}`);
  process.exit(1);
}

const ws = new WebSocket(`${base}/api/together/${randomId(10)}`);
const inbox = [];
let waiter = null;
ws.addEventListener("message", (e) => {
  inbox.push(JSON.parse(e.data));
  waiter?.();
});
ws.addEventListener("error", () => fail("socket error"));

async function next() {
  const timeout = setTimeout(() => fail("timed out"), 5000);
  while (inbox.length === 0) await new Promise((r) => (waiter = r));
  clearTimeout(timeout);
  return inbox.shift();
}

function expect(msg, t, code) {
  if (msg.t !== t || (code && msg.code !== code))
    fail(`expected ${t}${code ? ` ${code}` : ""}, got ${JSON.stringify(msg)}`);
}

const env = (kind, id) => ({ kind, id, version: Date.now(), iv: randomId(12), data: randomId(64) });

expect(await next(), "snapshot");

const admin = randomId(16);
ws.send(
  JSON.stringify({
    t: "put",
    env: env("group", "group"),
    secret: admin,
    secretHash: await hashSecret(admin),
    until: "2027-03-31",
  }),
);
expect(await next(), "update");

const member = randomId(16);
const memberId = randomId(6);
ws.send(
  JSON.stringify({
    t: "put",
    env: env("member", memberId),
    secret: member,
    secretHash: await hashSecret(member),
  }),
);
expect(await next(), "update");

ws.send(JSON.stringify({ t: "put", env: env("group", "group"), secret: member }));
expect(await next(), "error", "auth");

ws.close();
console.log("ok");
process.exit(0);
