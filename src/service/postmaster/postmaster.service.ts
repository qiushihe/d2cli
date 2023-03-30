import { AppModule } from "~src/module/app.module";
import { Destiny2ActionService } from "~src/service/destiny2-action/destiny2-action.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";

export class PostmasterService {
  private readonly destiny2ActionService: Destiny2ActionService;
  private readonly inventoryService: InventoryService;

  constructor() {
    this.destiny2ActionService = AppModule.getDefaultInstance().resolve(Destiny2ActionService);

    this.inventoryService = AppModule.getDefaultInstance().resolve(InventoryService);
  }

  async getItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    logger.debug(`Getting postmaster buckets ...`);
    const [postmasterBucketsErr, postmasterBuckets] =
      await this.inventoryService.getLocationBuckets(ItemLocation.Postmaster);
    if (postmasterBucketsErr) {
      return [postmasterBucketsErr, null];
    }

    const postmasterBucketHashes = postmasterBuckets.map(
      (postmasterBucket) => postmasterBucket.hash
    );

    logger.debug(`Getting inventory items ...`);
    const [inventoryItemsErr, inventoryItems] = await this.inventoryService.getInventoryItems(
      sessionId,
      membershipType,
      membershipId,
      characterId
    );
    if (inventoryItemsErr) {
      return [inventoryItemsErr, null];
    }

    return [
      null,
      inventoryItems.filter((item) => postmasterBucketHashes.includes(item.bucketHash))
    ];
  }

  async pullItem(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<Error | null> {
    return await this.destiny2ActionService.pullFromPostmaster(
      sessionId,
      membershipType,
      characterId,
      itemHash,
      itemInstanceId
    );
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("PostmasterService");
  }
}
