import crypto from "crypto";

export const sha1Digest = async (input: string): Promise<string> => {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16))
    .join("");
};
