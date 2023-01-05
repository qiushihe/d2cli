import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { ItemLocation } from "~type/bungie-api/destiny.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";
import { Destiny2ManifestInventoryBucketDefinitions } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";

export class Destiny2InventoryService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2ManifestService: Destiny2ManifestService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
  }

  async getPostmasterItems(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string
  ): Promise<[Error, null] | [null, DestinyItemComponent[]]> {
    const logger = this.getLogger();

    const [postmasterBucketHashesErr, postmasterBucketHashes] = await this.getLocationBucketHashes(
      ItemLocation.Postmaster
    );
    if (postmasterBucketHashesErr) {
      return [postmasterBucketHashesErr, null];
    }

    logger.debug(
      `Fetching postmaster items for ${membershipType}/${membershipId}/${characterId} ...`
    );
    const [characterInventoryErr, characterInventoryRes] =
      await this.bungieApiService.sendSessionApiRequest(
        sessionId,
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${DestinyComponentType.CharacterInventories}`,
        null
      );
    if (characterInventoryErr) {
      return [characterInventoryErr, null];
    }

    const [characterInventoryJsonErr, characterInventoryJson] =
      await this.bungieApiService.extractApiResponse<DestinyCharacterResponse>(
        characterInventoryRes
      );
    if (characterInventoryJsonErr) {
      return [characterInventoryJsonErr, null];
    }

    const postmasterItems = (characterInventoryJson.Response?.inventory?.data.items || []).filter(
      (item) => postmasterBucketHashes.includes(item.bucketHash)
    );

    return [null, postmasterItems];
  }

  async pullItemFromPostmaster(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemHash: number,
    itemInstanceId: string | null
  ): Promise<Error | null> {
    const [pullItemErr, pullItemRes] = await this.bungieApiService.sendSessionApiRequest(
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

    if (pullItemRes.status < 200 || pullItemRes.status > 299) {
      const genericMessage = `Unable to extract error message for response status: ${pullItemRes.status} ${pullItemRes.statusText}`;

      const [extractJsonResErr, jsonRes] = await this.bungieApiService.extractResponseJson(
        pullItemRes
      );
      if (extractJsonResErr) {
        const [extractTextResErr, textRes] = await this.bungieApiService.extractResponseText(
          pullItemRes
        );
        if (extractTextResErr) {
          return new Error(genericMessage);
        } else {
          return new Error(textRes);
        }
      } else {
        return new Error(jsonRes.Message || genericMessage);
      }
    } else {
      return null;
    }
  }

  async getLocationBucketHashes(location: ItemLocation): Promise<[Error, null] | [null, number[]]> {
    const [bucketDefinitionErr, bucketDefinitions] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryBucketDefinitions>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.InventoryBucketDefinition
      );
    if (bucketDefinitionErr) {
      return [bucketDefinitionErr, null];
    }

    return [
      null,
      Object.values(bucketDefinitions)
        .filter((bucketDefinition) => bucketDefinition.location === location)
        .map((bucketDefinition) => bucketDefinition.hash)
    ];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2InventoryService");
  }
}
