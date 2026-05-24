// Restructures dist/ into Vercel Build Output API format and esbuild-bundles
// dist/server/server.js into a single self-contained file (no node_modules needed).
import { build as esbuild } from "esbuild";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const out = join(root, ".vercel", "output");
const fnDir = join(out, "functions", "index.func");

if (!existsSync(join(dist, "server", "server.js"))) {
  throw new Error("dist/server/server.js not found - run vite build first.");
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await cp(join(dist, "client"), join(out, "static"), { recursive: true });

await mkdir(fnDir, { recursive: true });
await esbuild({
  entryPoints: [join(dist, "server", "server.js")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: join(fnDir, "server.js"),
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
  logLevel: "info",
});
console.log("[build-vercel] esbuild bundled server.js");

const adapter = `// Vercel Node serverless function adapter
import server from "./server.js";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, \`http://\${req.headers.host ?? "localhost"}\`);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
      else headers.set(k, String(v));
    }
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, {
      method: req.method,
      headers,
      body: hasBody ? req : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const response = await server.fetch(request);
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error("[vercel-fn] handler error:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
`;
await writeFile(join(fnDir, "index.mjs"), adapter, "utf8");

await writeFile(
  join(fnDir, ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs20.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
  }, null, 2),
  "utf8",
);

const staticFiles = await readdir(join(out, "static"));
console.log("[build-vercel] static entries:", staticFiles.length);

await writeFile(
  join(out, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index" },
    ],
  }, null, 2),
  "utf8",
);

console.log("[build-vercel] wrote .vercel/output/ successfully");