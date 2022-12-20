import { describe, expect, it } from "@jest/globals";

import { base42DecodeString, base42EncodeString } from "./string.helper";

describe("helper / string", () => {
  it("should encode string", async () => {
    expect(base42EncodeString("oh hai!")).toEqual("2Z5P4SCc5G2");
  });

  it("should decode string", async () => {
    expect(base42DecodeString("2Z5P4SCc5G2")).toEqual("oh hai!");
  });
});
