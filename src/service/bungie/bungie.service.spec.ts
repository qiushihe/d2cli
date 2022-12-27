import { describe, expect, it } from "@jest/globals";

import { useModule } from "~test/use-module";

import { BungieService } from "./bungie.service";

describe("service / bungie / BungieService", () => {
  const { getModule } = useModule<BungieService>("BungieService");

  it("should do something", async () => {
    // await getModule().test();
    expect(getModule()).not.toBeNull();
    expect(1).toEqual(1);
  });
});
