// lib/agentReady/net/safeFetch.ts
//
// v1.9.0 — the only way the Agent-Ready scanner talks to the network.
//
// The URL comes from a stranger, so every request is treated as an SSRF
// attempt until proven otherwise:
//   - http and https only, default ports only, no credentials in the URL;
//   - the host is resolved HERE, every address it resolves to must be public
//     (net/ip.ts), and the socket is opened to that exact address — the name is
//     never resolved a second time, so a DNS answer cannot change between the
//     check and the connection (DNS rebinding);
//   - redirects are followed by hand, at most MAX_REDIRECTS, and each hop goes
//     through the same validation;
//   - the body is read up to a byte cap (after decompression) and the whole
//     request has a deadline;
//   - nothing from the caller's request (cookies, authorization) is forwarded.
//
// `resolve` and `transport` are injectable so the rules can be tested without
// a network.

import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { Readable } from "node:stream";

import { ipVersion, isPublicAddress } from "./ip";

export const SCANNER_USER_AGENT = "PrompteaAgentReady/1.0 (+https://www.promptea.me/en/agent-ready)";

export const FETCH_LIMITS = {
  maxRedirects: 4,
  maxBytes: 1_500_000,
  timeoutMs: 8_000,
  maxUrlLength: 2_000,
} as const;

export type SafeFetchErrorCode =
  | "invalid_url"
  | "blocked_scheme"
  | "blocked_port"
  | "blocked_credentials"
  | "blocked_host"
  | "blocked_address"
  | "dns_failed"
  | "too_many_redirects"
  | "bad_redirect"
  | "timeout"
  | "network";

export class SafeFetchError extends Error {
  code: SafeFetchErrorCode;
  constructor(code: SafeFetchErrorCode, message?: string) {
    super(message ?? code);
    this.name = "SafeFetchError";
    this.code = code;
  }
}

export type ResolvedAddress = { address: string; family: 4 | 6 };
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type TransportRequest = {
  url: URL;
  /** The vetted address the socket must connect to. */
  address: ResolvedAddress;
  method: "GET" | "HEAD";
  headers: Record<string, string>;
  maxBytes: number;
  signal: AbortSignal;
};
export type TransportResponse = { status: number; headers: Record<string, string>; body: Buffer; truncated: boolean };
export type Transport = (req: TransportRequest) => Promise<TransportResponse>;

export type SafeResponse = {
  /** The URL that was asked for. */
  requestedUrl: string;
  /** The URL that answered, after redirects. */
  url: string;
  status: number;
  /** Lower-cased header names. */
  headers: Record<string, string>;
  body: string;
  bytes: number;
  truncated: boolean;
  redirects: string[];
};

export type SafeFetchOptions = {
  method?: "GET" | "HEAD";
  accept?: string;
  maxBytes?: number;
  timeoutMs?: number;
  resolve?: Resolver;
  transport?: Transport;
};

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home", ".corp", ".home.arpa", ".onion", ".test", ".invalid", ".example"];

/**
 * Parses and vets a user-supplied URL. Throws SafeFetchError; returns a
 * normalized URL (no fragment). A bare host ("example.com") gets https://.
 */
export function parsePublicUrl(input: string): URL {
  const raw = input.trim();
  if (!raw || raw.length > FETCH_LIMITS.maxUrlLength || /[\s\u0000-\u001f]/.test(raw)) throw new SafeFetchError("invalid_url");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new SafeFetchError("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SafeFetchError("blocked_scheme");
  if (url.username || url.password) throw new SafeFetchError("blocked_credentials");
  if (url.port !== "") throw new SafeFetchError("blocked_port");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new SafeFetchError("invalid_url");
  const literal = host.startsWith("[") ? host.slice(1, -1) : host;
  if (ipVersion(literal)) {
    if (!isPublicAddress(literal)) throw new SafeFetchError("blocked_address");
  } else {
    // WHATWG URL already normalizes numeric forms ("2130706433", "0x7f.1") to dotted IPv4,
    // so a name reaching this branch is a DNS name: it needs a dot and a non-reserved suffix.
    if (!host.includes(".") || host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) throw new SafeFetchError("blocked_host");
    if (!/^[a-z0-9.-]+$/.test(host)) throw new SafeFetchError("invalid_url");
  }
  url.hash = "";
  return url;
}

const defaultResolver: Resolver = async (hostname) => {
  const all = await dnsLookup(hostname, { all: true, verbatim: true });
  return all.map((a) => ({ address: a.address, family: a.family === 6 ? 6 : 4 }));
};

/** Resolves a vetted URL's host to one public address, or throws. EVERY answer must be public. */
export async function resolvePublic(url: URL, resolve: Resolver = defaultResolver): Promise<ResolvedAddress> {
  const host = url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;
  const v = ipVersion(host);
  if (v) {
    if (!isPublicAddress(host)) throw new SafeFetchError("blocked_address");
    return { address: host, family: v };
  }
  let answers: ResolvedAddress[];
  try {
    answers = await resolve(host);
  } catch {
    throw new SafeFetchError("dns_failed");
  }
  if (answers.length === 0) throw new SafeFetchError("dns_failed");
  // One private answer among public ones is enough to refuse: which one the
  // socket would pick is not ours to gamble on.
  if (answers.some((a) => !isPublicAddress(a.address))) throw new SafeFetchError("blocked_address");
  return answers.find((a) => a.family === 4) ?? answers[0];
}

function decodeStream(res: http.IncomingMessage): Readable {
  const enc = String(res.headers["content-encoding"] ?? "").toLowerCase().trim();
  if (enc === "gzip" || enc === "x-gzip") return res.pipe(createGunzip());
  if (enc === "deflate") return res.pipe(createInflate());
  if (enc === "br") return res.pipe(createBrotliDecompress());
  return res;
}

const nodeTransport: Transport = (req) =>
  new Promise<TransportResponse>((resolve, reject) => {
    const isHttps = req.url.protocol === "https:";
    const lib = isHttps ? https : http;
    const host = req.url.hostname.startsWith("[") ? req.url.hostname.slice(1, -1) : req.url.hostname;
    const request = lib.request(
      {
        protocol: req.url.protocol,
        // Connect to the vetted address; the name is only used for Host and TLS (SNI + certificate).
        host: req.address.address,
        family: req.address.family,
        port: isHttps ? 443 : 80,
        method: req.method,
        path: `${req.url.pathname}${req.url.search}`,
        headers: { ...req.headers, host: req.url.host },
        ...(isHttps ? { servername: ipVersion(host) ? undefined : host } : {}),
        agent: false,
        signal: req.signal,
      },
      (res) => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (v !== undefined) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
        }
        const status = res.statusCode ?? 0;
        if (req.method === "HEAD" || (status >= 300 && status < 400)) {
          res.resume();
          resolve({ status, headers, body: Buffer.alloc(0), truncated: false });
          return;
        }
        const stream = decodeStream(res);
        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = (truncated: boolean) => {
          if (done) return;
          done = true;
          resolve({ status, headers, body: Buffer.concat(chunks), truncated });
        };
        stream.on("data", (chunk: Buffer) => {
          if (done) return;
          const room = req.maxBytes - size;
          if (chunk.length >= room) {
            chunks.push(chunk.subarray(0, room));
            size = req.maxBytes;
            finish(true);
            request.destroy();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        stream.on("end", () => finish(false));
        // A broken or lying compressed body: keep what was decoded.
        stream.on("error", () => finish(true));
      },
    );
    request.on("error", (err) => reject(err));
    request.end();
  });

const REQUEST_HEADERS = { "user-agent": SCANNER_USER_AGENT, "accept-encoding": "gzip, deflate, br", "accept-language": "en" };

/**
 * Fetches a user-supplied URL under the rules at the top of this file.
 * Never throws on an HTTP status; throws SafeFetchError when the request is
 * refused or the network fails.
 */
export async function safeFetch(input: string | URL, opts: SafeFetchOptions = {}): Promise<SafeResponse> {
  const transport = opts.transport ?? nodeTransport;
  const maxBytes = Math.min(opts.maxBytes ?? FETCH_LIMITS.maxBytes, FETCH_LIMITS.maxBytes);
  const signal = AbortSignal.timeout(Math.min(opts.timeoutMs ?? FETCH_LIMITS.timeoutMs, FETCH_LIMITS.timeoutMs));
  const first = parsePublicUrl(typeof input === "string" ? input : input.toString());
  const redirects: string[] = [];
  let url = first;

  for (let hop = 0; ; hop++) {
    const address = await resolvePublic(url, opts.resolve);
    let res: TransportResponse;
    try {
      res = await transport({
        url,
        address,
        method: opts.method ?? "GET",
        headers: { ...REQUEST_HEADERS, accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
        maxBytes,
        signal,
      });
    } catch (err) {
      if (err instanceof SafeFetchError) throw err;
      if (signal.aborted) throw new SafeFetchError("timeout");
      throw new SafeFetchError("network", err instanceof Error ? err.message : undefined);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      if (hop >= FETCH_LIMITS.maxRedirects) throw new SafeFetchError("too_many_redirects");
      let next: URL;
      try {
        // Relative locations resolve against the current hop; the result is vetted like a fresh URL.
        next = parsePublicUrl(new URL(res.headers.location, url).toString());
      } catch (err) {
        if (err instanceof SafeFetchError && err.code !== "invalid_url") throw err;
        throw new SafeFetchError("bad_redirect");
      }
      // https → http would let a network attacker read the scan; refuse the downgrade.
      if (url.protocol === "https:" && next.protocol === "http:") throw new SafeFetchError("bad_redirect");
      redirects.push(next.toString());
      url = next;
      continue;
    }

    return {
      requestedUrl: first.toString(),
      url: url.toString(),
      status: res.status,
      headers: res.headers,
      body: res.body.toString("utf8"),
      bytes: res.body.length,
      truncated: res.truncated,
      redirects,
    };
  }
}
