// lib/agentReady/net/ip.ts
//
// v1.9.0 — which addresses the Agent-Ready scanner may connect to. The scanner
// fetches URLs typed by strangers from inside our infrastructure, so anything
// that is not a public, globally routable unicast address is refused: loopback,
// private ranges, link-local (cloud metadata lives at 169.254.169.254),
// carrier-grade NAT, documentation and benchmark ranges, multicast, reserved,
// and every IPv6 form that smuggles an IPv4 address (mapped, compatible, NAT64,
// 6to4, Teredo), which is checked against the IPv4 rules.
//
// Pure functions; no DNS here (see safeFetch.ts, which resolves first and then
// connects to the exact address that passed this check).

export type IpVersion = 4 | 6;

/** Parses dotted-quad IPv4 strictly (four decimal octets, no leading zeros, no shorthand). */
export function parseIPv4(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return null;
  if (m.slice(1).some((part) => part.length > 1 && part.startsWith("0"))) return null;
  return o;
}

/** Parses an IPv6 address (with optional embedded IPv4 tail) into 8 hextets. */
export function parseIPv6(input: string): number[] | null {
  let s = input.trim();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);
  if (!/^[0-9a-fA-F:.]+$/.test(s) || !s.includes(":")) return null;

  // An embedded IPv4 tail (::ffff:1.2.3.4) becomes its two hextets.
  const lastColon = s.lastIndexOf(":");
  const last = s.slice(lastColon + 1);
  if (last.includes(".")) {
    const v4 = parseIPv4(last);
    if (!v4) return null;
    s = `${s.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  } else if (s.includes(".")) {
    return null;
  }

  const dbl = s.indexOf("::");
  if (dbl !== s.lastIndexOf("::")) return null;
  const toHextets = (part: string): number[] | null => {
    if (part === "") return [];
    const out: number[] = [];
    for (const h of part.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(h)) return null;
      out.push(parseInt(h, 16));
    }
    return out;
  };

  if (dbl === -1) {
    const all = toHextets(s);
    return all && all.length === 8 ? all : null;
  }
  const a = toHextets(s.slice(0, dbl));
  const b = toHextets(s.slice(dbl + 2));
  if (!a || !b) return null;
  const fill = 8 - a.length - b.length;
  if (fill < 1) return null;
  return [...a, ...new Array<number>(fill).fill(0), ...b];
}

function v4IsPublic(o: readonly number[]): boolean {
  const [a, b, c] = o;
  if (a === 0) return false; // "this network"
  if (a === 10) return false; // private
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 0 && c === 0) return false; // IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return false; // TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return false; // 6to4 relay anycast
  if (a === 192 && b === 168) return false; // private
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

const v4FromHextets = (hi: number, lo: number): number[] => [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff];

function v6IsPublic(h: readonly number[]): boolean {
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d): judged as IPv4.
  if (h.slice(0, 5).every((x) => x === 0)) {
    if (h[5] === 0xffff) return v4IsPublic(v4FromHextets(h[6], h[7]));
    if (h[5] === 0) return false; // ::, ::1 and the deprecated compatible form
  }
  // NAT64 well-known (64:ff9b::/96) and local-use (64:ff9b:1::/48).
  if (h[0] === 0x64 && h[1] === 0xff9b) {
    if (h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0) return v4IsPublic(v4FromHextets(h[6], h[7]));
    return false;
  }
  if (h[0] === 0x2002) return v4IsPublic(v4FromHextets(h[1], h[2])); // 6to4 embeds an IPv4
  if (h[0] === 0x2001 && h[1] === 0) return false; // Teredo
  if (h[0] === 0x2001 && h[1] === 0xdb8) return false; // documentation
  if (h[0] === 0x2001 && h[1] >= 0x10 && h[1] <= 0x2f) return false; // ORCHID / ORCHIDv2
  if (h[0] === 0x100 && h[1] === 0 && h[2] === 0 && h[3] === 0) return false; // discard-only
  if ((h[0] & 0xfe00) === 0xfc00) return false; // unique local fc00::/7
  if ((h[0] & 0xffc0) === 0xfe80) return false; // link-local fe80::/10
  if ((h[0] & 0xffc0) === 0xfec0) return false; // site-local (deprecated)
  if ((h[0] & 0xff00) === 0xff00) return false; // multicast
  // Global unicast is 2000::/3; everything else is unassigned or special.
  return (h[0] & 0xe000) === 0x2000;
}

/** 4 or 6 when `s` is an IP literal, otherwise 0. */
export function ipVersion(s: string): IpVersion | 0 {
  if (parseIPv4(s)) return 4;
  if (parseIPv6(s)) return 6;
  return 0;
}

/** True only for a public, globally routable unicast address. Unparseable input is not public. */
export function isPublicAddress(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4) return v4IsPublic(v4);
  const v6 = parseIPv6(address);
  if (v6) return v6IsPublic(v6);
  return false;
}
