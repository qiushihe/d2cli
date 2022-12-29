import { describe, expect, it } from "@jest/globals";

import { sha1Digest } from "./crypto.helper";

describe("helper / crypto", () => {
  describe("sha256Digest", () => {
    it("should do something", async () => {
      const digest = await sha1Digest("oh hai");
      const expectedDigest = "7c61cafbf1864d6b79b325a7bd769332a4e99de4e5c046067406e90e45860ef";

      expect(digest).toEqual(expectedDigest);
    });
  });
});
