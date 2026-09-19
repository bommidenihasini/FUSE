import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createFuseApi } from "./app.js";

const PORT = Number.parseInt(process.env.FUSE_API_PORT ?? "8787", 10);

function readHeaders(request: IncomingMessage): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value[0];
    }
  }
  return headers;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

const api = createFuseApi();

const server = createServer((request: IncomingMessage, response: ServerResponse) => {
  void (async () => {
    const host = request.headers.host ?? "127.0.0.1";
    const url = new URL(request.url ?? "/", `http://${host}`);
    const result = await api.handle({
      method: request.method ?? "GET",
      path: url.pathname,
      headers: readHeaders(request),
      body: await readBody(request),
    });
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
  })().catch(() => {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Internal error", liveBedrock: false }));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(
    `Fuse API (synthetic, liveBedrock=false) listening on http://127.0.0.1:${String(PORT)}\n`,
  );
});
