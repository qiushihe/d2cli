import { describe, expect, it } from "@jest/globals";

import { sha1Digest } from "./crypto.helper";

describe("helper / crypto", () => {
  describe("sha1Digest", () => {
    it("should generate SHA1 hash of strings", async () => {
      expect(sha1Digest("oh hai")).toEqual("9448c7fd757c498b96c611ed6e58352bcacfff33");
    });
  });
});
