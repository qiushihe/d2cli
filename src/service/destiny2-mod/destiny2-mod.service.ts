import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { DestinyComponentType, SocketPlugSources } from "~type/bungie-api/destiny.types";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type GetProfileCharacterPlugItemHashesOptions = {
  includeProfilePlugs?: boolean;
  includeCharacterPlugs?: boolean;
};

export class Destiny2ModService {
  private readonly bungieApiService: BungieApiService;
  private readonly destiny2ManifestService: Destiny2ManifestService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
  }

  async getArmourModSocketIndices(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    itemHash: number
  ): Promise<[Error, null] | [null, number[]]> {
    const logger = this.getLogger();

    logger.debug(`Getting item definitions ...`);
    const [itemDefinitionsErr, itemDefinitions] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.InventoryItemDefinition
      );
    if (itemDefinitionsErr) {
      return [itemDefinitionsErr, null];
    }

    logger.debug(`Getting socket category definitions ...`);
    const [socketCategoryDefinitionsErr, socketCategoryDefinitions] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.SocketCategoryDefinition
      );
    if (socketCategoryDefinitionsErr) {
      return [socketCategoryDefinitionsErr, null];
    }

    const itemDefinition = itemDefinitions[itemHash];
    if (!itemDefinition) {
      return [new Error(`Invalid item hash: ${itemHash}`), null];
    }
    if (!itemDefinition.sockets) {
      return [new Error(`Item has no sockets`), null];
    }

    const itemDefinitionSocketCategories = itemDefinition.sockets.socketCategories;

    const armourModsSocketCategory =
      itemDefinitionSocketCategories.find((socketCategory) => {
        const socketCategoryDefinition =
          socketCategoryDefinitions[socketCategory.socketCategoryHash];
        return socketCategoryDefinition?.displayProperties.name === "ARMOR MODS";
      }) || null;
    if (!armourModsSocketCategory) {
      return [new Error(`Item has no armour mods socket`), null];
    }

    return [null, armourModsSocketCategory.socketIndexes];
  }

  async getArmourModPlugItemHashes(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    itemHash: number
  ): Promise<[Error, null] | [null, number[][]]> {
    const logger = this.getLogger();

    logger.debug(`Getting item definitions ...`);
    const [itemDefinitionsErr, itemDefinitions] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.InventoryItemDefinition
      );
    if (itemDefinitionsErr) {
      return [itemDefinitionsErr, null];
    }

    const itemDefinition = itemDefinitions[itemHash];
    if (!itemDefinition) {
      return [new Error(`Invalid item hash: ${itemHash}`), null];
    }
    if (!itemDefinition.sockets) {
      return [new Error(`Item has no sockets`), null];
    }

    const [armourModsSocketIndicesErr, armourModsSocketIndices] =
      await this.getArmourModSocketIndices(
        sessionId,
        membershipType,
        membershipId,
        characterId,
        itemHash
      );
    if (armourModsSocketIndicesErr) {
      return [armourModsSocketIndicesErr, null];
    }

    const itemDefinitionSocketEntries = itemDefinition.sockets.socketEntries;
    const armourModItemHashes: number[][] = [];

    // The values in `itemDefinition.sockets[].socketCategories[].socketIndexes`
    // are also indices but for the  `itemDefinition.sockets[].socketEntries`
    // array.
    // However, from the "outside", we want the consumer to be able to just
    // say "give me plug hashes for socket index 1", where that `1` referred to
    // the index of `socketCategories[].socketIndexes`. This way, form the
    // outside world doesn't have to know about the internal index values.
    for (
      let socketEntryIndexIndex = 0;
      socketEntryIndexIndex < armourModsSocketIndices.length;
      socketEntryIndexIndex++
    ) {
      const socketEntryIndex = armourModsSocketIndices[socketEntryIndexIndex];
      const socketEntry = itemDefinitionSocketEntries[socketEntryIndex];
      const socketEntryPlugSources = socketEntry.plugSources;

      const hasLocalPlugs = !!(socketEntryPlugSources & SocketPlugSources.ReusablePlugItems);
      const hasProfilePlugs = !!(socketEntryPlugSources & SocketPlugSources.ProfilePlugSet);
      const hasCharacterPlugs = !!(socketEntryPlugSources & SocketPlugSources.CharacterPlugSet);

      if (hasLocalPlugs) {
        // Use `socketEntryIndexIndex` because that's the external index.
        armourModItemHashes[socketEntryIndexIndex] = (socketEntry.reusablePlugItems || []).map(
          (item) => item.plugItemHash
        );
      }

      if (hasProfilePlugs || hasCharacterPlugs) {
        if (!socketEntry.reusablePlugSetHash) {
          return [
            new Error(`Socket entry at index ${socketEntryIndex} missing reusable plug set hash`),
            null
          ];
        }

        const [profileCharacterPlugItemHashesErr, profileCharacterPlugItemHashes] =
          await this.getProfileCharacterPlugItemHashes(
            sessionId,
            membershipType,
            membershipId,
            characterId,
            socketEntry.reusablePlugSetHash,
            {
              includeProfilePlugs: hasProfilePlugs,
              includeCharacterPlugs: hasCharacterPlugs
            }
          );
        if (profileCharacterPlugItemHashesErr) {
          return [profileCharacterPlugItemHashesErr, null];
        }

        // Use `socketEntryIndexIndex` because that's the external index.
        armourModItemHashes[socketEntryIndexIndex] = profileCharacterPlugItemHashes;
      }
    }

    return [null, armourModItemHashes];
  }

  async getProfileCharacterPlugItemHashes(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    plugSetHash: number,
    options: GetProfileCharacterPlugItemHashesOptions
  ): Promise<[Error, null] | [null, number[]]> {
    if (!options.includeProfilePlugs && !options.includeCharacterPlugs) {
      return [null, []];
    }

    const logger = this.getLogger();

    logger.debug(`Getting profile item sockets ...`);
    const [profileErr, profileRes] = await this.bungieApiService.sendSessionApiRequest(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}?components=${DestinyComponentType.ItemSockets}`,
      null
    );
    if (profileErr) {
      return [profileErr, null];
    }

    const [profileJsonErr, profileJson] =
      await this.bungieApiService.extractApiResponse<DestinyProfileResponse>(profileRes);
    if (profileJsonErr) {
      return [profileJsonErr, null];
    }

    const profilePlugSets = profileJson.Response?.profilePlugSets?.data?.plugs || {};
    const characterPlugSets =
      (profileJson.Response?.characterPlugSets?.data || {})[characterId]?.plugs || {};

    const profilePlugSet = profilePlugSets[plugSetHash] || [];
    const characterPlugSet = characterPlugSets[plugSetHash] || [];

    return [
      null,
      [
        ...(options.includeProfilePlugs ? profilePlugSet : []),
        ...(options.includeCharacterPlugs ? characterPlugSet : [])
      ]
        .filter((plug) => plug.enabled && plug.canInsert)
        .map((plug) => plug.plugItemHash)
    ];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("Destiny2ModService");
  }
}
