import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyItemTransferRequest } from "~type/bungie-api/destiny/requests";
import { DestinyItemActionRequest } from "~type/bungie-api/destiny/requests/actions";
import { DestinyPostmasterTransferRequest } from "~type/bungie-api/destiny/requests/actions";
import { DestinyInsertPlugsFreeActionRequest } from "~type/bungie-api/destiny/requests/actions";
import { DestinySocketArrayType } from "~type/bungie-api/destiny/requests/actions";
import { DestinyItemChangeResponse } from "~type/bungie-api/destiny/responses";

export class Destiny2ActionService {
  private readonly bungieApiService: BungieApiService;

  constructor() {
    this.bungieApiService = AppModule.getDefaultInstance().resolve(BungieApiService);
  }

  async pullFromPostmaster(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<ErrorXOR<void>> {
    return await this.bungieApiService.sendApiRequest<DestinyPostmasterTransferRequest>(
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
  }

  async insertPlug(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemInstanceId: string,
    socketIndex: number,
    plugItemHash: number
  ): Promise<ErrorXOR<void>> {
    const logger = this.getLogger();

    logger.debug(`Inserting plug into socket ...`);
    const [insertErr] = await this.bungieApiService.sendApiRequest<
      DestinyInsertPlugsFreeActionRequest,
      DestinyItemChangeResponse
    >(sessionId, "POST", "/Destiny2/Actions/Items/InsertSocketPlugFree", {
      plug: {
        socketIndex,
        socketArrayType: DestinySocketArrayType.Default,
        plugItemHash
      },
      membershipType,
      characterId,
      itemId: itemInstanceId
    });
    if (insertErr) {
      return [insertErr, null];
    }

    return [null, undefined];
  }

  async transferItemToVault(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<ErrorXOR<void>> {
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
      return [transferItemErr, null];
    }

    return [null, undefined];
  }

  async transferItemFromVault(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<ErrorXOR<void>> {
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
      return [transferItemErr, null];
    }

    return [null, undefined];
  }

  async equipItem(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemInstanceId: string
  ): Promise<ErrorXOR<void>> {
    const [equipItemErr] = await this.bungieApiService.sendApiRequest<DestinyItemActionRequest>(
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
      return [equipItemErr, null];
    }

    return [null, undefined];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("Destiny2ActionService");
  }
}
