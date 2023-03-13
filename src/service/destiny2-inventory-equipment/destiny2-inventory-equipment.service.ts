import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyItemActionRequest } from "~type/bungie-api/destiny/requests/actions";

export class Destiny2InventoryEquipmentService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2InventoryService: Destiny2InventoryService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2InventoryService =
      AppModule.getDefaultInstance().resolve<Destiny2InventoryService>("Destiny2InventoryService");
  }

  async equip(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemInstanceId: string
  ): Promise<Error | null> {
    const [equipItemErr, equipItemRes] =
      await this.bungieApiService.sendSessionApiRequest<DestinyItemActionRequest>(
        sessionId,
        "POST",
        "/Destiny2/Actions/Items/EquipItem",
        {
          itemId: itemInstanceId,
          characterId,
          membershipType
        }
      );
    if (equipItemErr) {
      return equipItemErr;
    }

    return await this.bungieApiService.extractResponseError(equipItemRes);
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2InventoryEquipmentService");
  }
}
