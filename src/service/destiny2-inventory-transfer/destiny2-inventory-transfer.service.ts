import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyItemTransferRequest } from "~type/bungie-api/destiny/requests";

export class Destiny2InventoryTransferService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2InventoryService: Destiny2InventoryService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");
  }

  async transferToVault(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<Error | null> {
    const [transferItemErr] =
      await this.bungieApiService.sendApiRequest<DestinyItemTransferRequest>(
        sessionId,
        "POST",
        "/Destiny2/Actions/Items/TransferItem",
        {
          transferToVault: true,
          itemReferenceHash: itemHash,
          itemId: itemInstanceId,
          characterId,
          membershipType
        }
      );
    if (transferItemErr) {
      return transferItemErr;
    }

    return null;
  }

  async transferFromVault(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<Error | null> {
    const [transferItemErr] =
      await this.bungieApiService.sendApiRequest<DestinyItemTransferRequest>(
        sessionId,
        "POST",
        "/Destiny2/Actions/Items/TransferItem",
        {
          transferToVault: false,
          itemReferenceHash: itemHash,
          itemId: itemInstanceId,
          characterId,
          membershipType
        }
      );
    if (transferItemErr) {
      return transferItemErr;
    }

    return null;
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2InventoryTransferService");
  }
}
