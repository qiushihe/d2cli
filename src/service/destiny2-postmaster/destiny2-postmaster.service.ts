import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyPostmasterTransferRequest } from "~type/bungie-api/destiny/requests/actions";

export class Destiny2PostmasterService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2InventoryService: Destiny2InventoryService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");
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
      await this.destiny2InventoryService.getLocationBuckets(ItemLocation.Postmaster);
    if (postmasterBucketsErr) {
      return [postmasterBucketsErr, null];
    }

    const postmasterBucketHashes = postmasterBuckets.map(
      (postmasterBucket) => postmasterBucket.hash
    );

    logger.debug(`Getting inventory items ...`);
    const [inventoryItemsErr, inventoryItems] =
      await this.destiny2InventoryService.getInventoryItems(
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
    const [pullItemErr] =
      await this.bungieApiService.sendApiRequest<DestinyPostmasterTransferRequest>(
        sessionId,
        "POST",
        "/Destiny2/Actions/Items/PullFromPostmaster",
        {
          itemReferenceHash: itemHash,
          itemId: itemInstanceId,
          characterId,
          membershipType
        }
      );
    if (pullItemErr) {
      return pullItemErr;
    }

    return null;
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2PostmasterService");
  }
}
