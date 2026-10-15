// Banner configs travel in the URL as base64url(deflate-raw(JSON)).
// CompressionStream exists in modern browsers and Node 18+, so this runs on both sides.

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeConfig(config: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(config));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export const MAX_ENCODED_LENGTH = 6000;

export async function decodeConfig(encoded: string): Promise<unknown> {
  if (encoded.length > MAX_ENCODED_LENGTH) throw new Error("Config too long");
  const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw"));
  if (bytes.length > 64 * 1024) throw new Error("Config too large");
  return JSON.parse(new TextDecoder().decode(bytes));
}
