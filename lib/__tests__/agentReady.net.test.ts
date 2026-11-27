// v1.9.0 — Agent-Ready: the SSRF rules of the scanner's only network door.

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isPublicAddress, parseIPv4, parseIPv6 } from "@/lib/agentReady/net/ip";
import { FETCH_LIMITS, SafeFetchError, parsePublicUrl, resolvePublic, safeFetch, type Resolver, type Transport, type TransportRequest } from "@/lib/agentReady/net/safeFetch";

describe("isPublicAddress", () => {
  it("accepts ordinary public addresses", () => {
    for (const a of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1", "2606:4700:4700::1111", "2a00:1450:4001:81b::200e"]) {
      expect(isPublicAddress(a), a).toBe(true);
    }
  });

  it("refuses loopback, private, link-local, CGNAT, documentation, multicast and reserved IPv4", () => {
    for (const a of [
      "0.0.0.0", "0.1.2.3", "10.0.0.1", "10.255.255.255", "100.64.0.1", "100.127.255.254", "127.0.0.1", "127.255.255.255",
      "169.254.169.254", "169.254.0.1", "172.16.0.1", "172.31.255.255", "192.0.0.1", "192.0.2.1", "192.88.99.1", "192.168.1.1",
      "198.18.0.1", "198.19.255.255", "198.51.100.7", "203.0.113.9", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    ]) {
      expect(isPublicAddress(a), a).toBe(false);
    }
  });

  it("refuses special IPv6 and every form that embeds a private IPv4", () => {
    for (const a of [
      "::", "::1", "fc00::1", "fd12:3456:789a::1", "fe80::1", "fe80::1%eth0", "fec0::1", "ff02::1", "2001:db8::1", "2001::1", "100::1",
      "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:169.254.169.254", "::ffff:7f00:1", "::127.0.0.1", "64:ff9b::7f00:1", "64:ff9b::10.0.0.1",
      "64:ff9b:1::1", "2002:7f00:1::1", "2002:a00:1::", "2002:c0a8:101::1", "[::1]", "4000::1", "::2",
    ]) {
      expect(isPublicAddress(a), a).toBe(false);
    }
    // The same wrappers around a public IPv4 are public.
    expect(isPublicAddress("::ffff:8.8.8.8")).toBe(true);
    expect(isPublicAddress("64:ff9b::808:808")).toBe(true);
    expect(isPublicAddress("2002:808:808::1")).toBe(true);
  });

  it("treats anything unparseable as not public", () => {
    for (const a of ["", "localhost", "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "1.2.3.4 ", "0x7f.0.0.1", "::g", ":::", "1::2::3", "1:2:3:4:5:6:7:8:9"]) {
      expect(isPublicAddress(a), a).toBe(false);
    }
    expect(parseIPv4("192.168.01.1")).toBeNull();
    expect(parseIPv6("1:2:3:4:5:6:7:8")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parseIPv6("::ffff:1.2.3.4")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
  });
});

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return err instanceof SafeFetchError ? err.code : `other:${String(err)}`;
  }
  return "ok";
};

describe("parsePublicUrl", () => {
  it("normalizes what a person types", () => {
    expect(parsePublicUrl("example.com").toString()).toBe("https://example.com/");
    expect(parsePublicUrl("  https://Example.com/a?b=1#frag ").toString()).toBe("https://example.com/a?b=1");
    expect(parsePublicUrl("http://example.com").protocol).toBe("http:");
  });

  it("refuses other schemes, ports, credentials and malformed input", () => {
    expect(code(() => parsePublicUrl("ftp://example.com"))).toBe("blocked_scheme");
    expect(code(() => parsePublicUrl("file:///etc/passwd"))).toBe("blocked_scheme");
    expect(code(() => parsePublicUrl("gopher://example.com"))).toBe("blocked_scheme");
    expect(code(() => parsePublicUrl("https://example.com:8443/"))).toBe("blocked_port");
    expect(code(() => parsePublicUrl("http://example.com:22"))).toBe("blocked_port");
    expect(code(() => parsePublicUrl("https://user:pass@example.com"))).toBe("blocked_credentials");
    expect(code(() => parsePublicUrl("https://admin@example.com"))).toBe("blocked_credentials");
    expect(code(() => parsePublicUrl(""))).toBe("invalid_url");
    expect(code(() => parsePublicUrl("https://exa mple.com"))).toBe("invalid_url");
    expect(code(() => parsePublicUrl(`https://example.com/${"a".repeat(FETCH_LIMITS.maxUrlLength)}`))).toBe("invalid_url");
  });

  it("refuses internal names and every spelling of a private address", () => {
    for (const u of ["http://localhost", "http://localhost.", "https://intranet", "https://db.internal", "https://printer.local", "https://foo.localhost", "https://x.home.arpa", "https://site.test"]) {
      expect(code(() => parsePublicUrl(u)), u).toBe("blocked_host");
    }
    for (const u of [
      "http://127.0.0.1", "http://10.0.0.5/admin", "http://169.254.169.254/latest/meta-data/", "http://192.168.1.1", "http://[::1]/", "http://[fd00::1]/", "http://[::ffff:127.0.0.1]/",
      // WHATWG URL parsing turns these into 127.0.0.1 / 10.0.0.1, which is then refused:
      "http://2130706433", "http://0x7f000001", "http://0177.0.0.1", "http://127.1", "http://0x7f.1", "http://0/", "http://167772161",
    ]) {
      expect(code(() => parsePublicUrl(u)), u).toBe("blocked_address");
    }
  });
});

const resolverOf = (map: Record<string, string[]>): Resolver => async (host) => {
  const list = map[host];
  if (!list) throw new Error("ENOTFOUND");
  return list.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
};

describe("resolvePublic", () => {
  it("returns a vetted address, preferring IPv4", async () => {
    const r = resolverOf({ "example.com": ["2606:4700::1", "93.184.216.34"] });
    expect(await resolvePublic(new URL("https://example.com"), r)).toEqual({ address: "93.184.216.34", family: 4 });
  });

  it("refuses a name that resolves to a private address, even next to public ones", async () => {
    for (const answers of [["127.0.0.1"], ["10.1.2.3"], ["93.184.216.34", "169.254.169.254"], ["::1"], ["::ffff:192.168.0.1"]]) {
      await expect(resolvePublic(new URL("https://rebind.example.org"), resolverOf({ "rebind.example.org": answers }))).rejects.toMatchObject({ code: "blocked_address" });
    }
  });

  it("reports DNS failures", async () => {
    await expect(resolvePublic(new URL("https://nope.example.org"), resolverOf({}))).rejects.toMatchObject({ code: "dns_failed" });
    await expect(resolvePublic(new URL("https://empty.example.org"), resolverOf({ "empty.example.org": [] }))).rejects.toMatchObject({ code: "dns_failed" });
  });
});

type Canned = { status: number; headers?: Record<string, string>; body?: string };

function fakeNet(routes: Record<string, Canned>, dns: Record<string, string[]>) {
  const calls: TransportRequest[] = [];
  const transport: Transport = async (req) => {
    calls.push(req);
    const hit = routes[req.url.toString()];
    if (!hit) return { status: 404, headers: {}, body: Buffer.from("nope"), truncated: false };
    const body = Buffer.from(hit.body ?? "");
    return { status: hit.status, headers: hit.headers ?? {}, body: body.subarray(0, req.maxBytes), truncated: body.length > req.maxBytes };
  };
  return { calls, opts: { transport, resolve: resolverOf(dns) } };
}

describe("safeFetch", () => {
  it("connects to the address that was vetted, and forwards nothing but its own headers", async () => {
    const net = fakeNet({ "https://example.com/": { status: 200, headers: { "content-type": "text/html" }, body: "<h1>hi</h1>" } }, { "example.com": ["93.184.216.34"] });
    const res = await safeFetch("example.com", net.opts);
    expect(res).toMatchObject({ status: 200, url: "https://example.com/", body: "<h1>hi</h1>", redirects: [] });
    expect(net.calls[0].address).toEqual({ address: "93.184.216.34", family: 4 });
    expect(Object.keys(net.calls[0].headers).sort()).toEqual(["accept", "accept-encoding", "accept-language", "user-agent"]);
    expect(net.calls[0].headers["user-agent"]).toContain("PrompteaAgentReady");
  });

  it("follows redirects by hand and re-vets every hop", async () => {
    const net = fakeNet(
      {
        "https://example.com/": { status: 301, headers: { location: "https://www.example.com/home" } },
        "https://www.example.com/home": { status: 302, headers: { location: "/final" } },
        "https://www.example.com/final": { status: 200, body: "ok" },
      },
      { "example.com": ["93.184.216.34"], "www.example.com": ["93.184.216.35"] },
    );
    const res = await safeFetch("https://example.com/", net.opts);
    expect(res.url).toBe("https://www.example.com/final");
    expect(res.redirects).toEqual(["https://www.example.com/home", "https://www.example.com/final"]);
    expect(net.calls.map((c) => c.address.address)).toEqual(["93.184.216.34", "93.184.216.35", "93.184.216.35"]);
  });

  it("refuses a redirect into the private network, by literal or by name", async () => {
    for (const location of ["http://169.254.169.254/latest/meta-data/", "https://127.0.0.1/", "https://[::1]/", "https://internal.example.com/"]) {
      const net = fakeNet({ "https://example.com/": { status: 302, headers: { location } } }, { "example.com": ["93.184.216.34"], "internal.example.com": ["10.0.0.8"] });
      await expect(safeFetch("https://example.com/", net.opts), location).rejects.toBeInstanceOf(SafeFetchError);
      expect(net.calls).toHaveLength(1);
    }
  });

  it("refuses redirects to other schemes or ports, https→http downgrades, and loops", async () => {
    const one = (location: string) => fakeNet({ "https://example.com/": { status: 302, headers: { location } } }, { "example.com": ["93.184.216.34"] });
    await expect(safeFetch("https://example.com/", one("file:///etc/passwd").opts)).rejects.toMatchObject({ code: "blocked_scheme" });
    await expect(safeFetch("https://example.com/", one("https://example.com:8080/").opts)).rejects.toMatchObject({ code: "blocked_port" });
    await expect(safeFetch("https://example.com/", one("http://example.com/").opts)).rejects.toMatchObject({ code: "bad_redirect" });
    await expect(safeFetch("https://example.com/", one("https://example.com/").opts)).rejects.toMatchObject({ code: "too_many_redirects" });
  });

  it("caps the body and never asks for more than the limit", async () => {
    const net = fakeNet({ "https://example.com/": { status: 200, body: "x".repeat(5000) } }, { "example.com": ["93.184.216.34"] });
    const res = await safeFetch("https://example.com/", { ...net.opts, maxBytes: 1000 });
    expect(res.bytes).toBe(1000);
    expect(res.truncated).toBe(true);
    await safeFetch("https://example.com/", { ...net.opts, maxBytes: 50_000_000 });
    expect(net.calls[1].maxBytes).toBe(FETCH_LIMITS.maxBytes);
  });

  it("maps a stalled transport to a timeout and other failures to a network error", async () => {
    const dns = resolverOf({ "example.com": ["93.184.216.34"] });
    const stalled: Transport = (req) => new Promise((_, reject) => req.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    await expect(safeFetch("https://example.com/", { transport: stalled, resolve: dns, timeoutMs: 20 })).rejects.toMatchObject({ code: "timeout" });
    const broken: Transport = async () => {
      throw new Error("ECONNRESET");
    };
    await expect(safeFetch("https://example.com/", { transport: broken, resolve: dns })).rejects.toMatchObject({ code: "network" });
  });

  it("never reaches the transport for a refused URL", async () => {
    const net = fakeNet({}, {});
    await expect(safeFetch("http://169.254.169.254/", net.opts)).rejects.toMatchObject({ code: "blocked_address" });
    await expect(safeFetch("https://rebind.example.org/", { ...net.opts, resolve: resolverOf({ "rebind.example.org": ["127.0.0.1"] }) })).rejects.toMatchObject({ code: "blocked_address" });
    expect(net.calls).toHaveLength(0);
  });
});
