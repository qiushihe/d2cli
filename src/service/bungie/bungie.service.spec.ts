import { beforeEach, describe, expect, it } from "@jest/globals";

import { BungieService } from "./bungie.service";

describe("service / bungie / BungieService", () => {
  let service: BungieService;

  beforeEach(async () => {
    service = new BungieService();
  });

  it("should do something", async () => {
    await service.test();
    expect(service).not.toBeNull();
    expect(1).toEqual(1);
  });
});
