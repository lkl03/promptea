// lib/social/index.ts — `@/lib/social`: the X account links (handle, profile URL).
// The feed of posts is in ./feed.ts (pure) and ./server.ts (server-only).
export { normalizeHandle, handleFromUrl, resolveXLinks, getXLinks, type XLinks } from "./links";
