import { describe, expect, it } from "@jest/globals";

import { AppModule } from "~src/module/app.module";

import { sha1Digest } from "./crypto.helper";

describe("helper / crypto", () => {
  it("should do something", async () => {
    expect(AppModule.getDefaultInstance()).not.toBeNull();
    expect(sha1Digest).not.toBeNull();
    expect(1).toEqual(1);
  });

  describe("sha1Digest", () => {
    it("should generate SHA1 hash of strings", async () => {
      expect(sha1Digest("oh hai")).toEqual("9448c7fd757c498b96c611ed6e58352bcacfff33");
    });
  });
});
