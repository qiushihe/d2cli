import crypto from "crypto";

export const sha1Digest = (input: string): string => {
  const sha1Hash = crypto.createHash("sha1");
  sha1Hash.update(input);
  return sha1Hash.digest("hex");
};
