import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { SocketPlugSources } from "~type/bungie-api/destiny.types";
import { DestinyItemSocketCategoryDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyInsertPlugsFreeActionRequest } from "~type/bungie-api/destiny/requests/actions";
import { DestinySocketArrayType } from "~type/bungie-api/destiny/requests/actions";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";
import { DestinyItemChangeResponse } from "~type/bungie-api/destiny/responses";

import { SocketName } from "./destiny2-plug.service.types";
import { GetProfileCharacterPlugItemHashesOptions } from "./destiny2-plug.service.types";

export class Destiny2PlugService {
  private readonly bungieApiService: BungieApiService;
  private readonly manifestDefinitionService: ManifestDefinitionService;

  constructor() {
    this.bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    this.manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );
  }

  async insert(
    sessionId: string,
    membershipType: number,
    characterId: string,
    itemInstanceId: string,
    socketIndex: number,
    plugItemHash: number
  ): Promise<Error | null> {
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
      return insertErr;
    }

    return null;
  }

  async getSocketIndices(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    itemHash: number,
    socketName: SocketName
  ): Promise<[Error, null] | [null, number[]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching item definition for ${itemHash} ...`);
    const [itemDefinitionErr, itemDefinition] =
      await this.manifestDefinitionService.getItemDefinition(itemHash);
    if (itemDefinitionErr) {
      return [itemDefinitionErr, null];
    }
    if (!itemDefinition) {
      return [new Error(`Invalid item hash: ${itemHash}`), null];
    }
    if (!itemDefinition.sockets) {
      return [new Error(`Item has no sockets`), null];
    }

    const itemDefinitionSocketCategories = itemDefinition.sockets.socketCategories;

    let matchingSocketCategory: DestinyItemSocketCategoryDefinition | null = null;
    for (
      let socketCategoryIndex = 0;
      socketCategoryIndex < itemDefinitionSocketCategories.length;
      socketCategoryIndex++
    ) {
      const socketCategory = itemDefinitionSocketCategories[socketCategoryIndex];

      logger.debug(`Fetching socket category definition for ${itemHash} ...`);
      const [socketCategoryDefinitionErr, socketCategoryDefinition] =
        await this.manifestDefinitionService.getSocketCategoryDefinition(
          socketCategory.socketCategoryHash
        );
      if (socketCategoryDefinitionErr) {
        return [socketCategoryDefinitionErr, null];
      }

      if (socketCategoryDefinition?.displayProperties.name === socketName) {
        matchingSocketCategory = socketCategory;
      }
    }

    if (!matchingSocketCategory) {
      return [new Error(`Item has no matching sockets`), null];
    }

    return [null, matchingSocketCategory.socketIndexes];
  }

  async getPlugItemHashes(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    itemHash: number,
    socketName: SocketName
  ): Promise<[Error, null] | [null, number[][]]> {
    const logger = this.getLogger();

    logger.debug(`Fetching item definition for ${itemHash} ...`);
    const [itemDefinitionErr, itemDefinition] =
      await this.manifestDefinitionService.getItemDefinition(itemHash);
    if (itemDefinitionErr) {
      return [itemDefinitionErr, null];
    }
    if (!itemDefinition) {
      return [new Error(`Invalid item hash: ${itemHash}`), null];
    }
    if (!itemDefinition.sockets) {
      return [new Error(`Item has no sockets`), null];
    }

    const [socketIndicesErr, socketIndices] = await this.getSocketIndices(
      sessionId,
      membershipType,
      membershipId,
      characterId,
      itemHash,
      socketName
    );
    if (socketIndicesErr) {
      return [socketIndicesErr, null];
    }

    const itemDefinitionSocketEntries = itemDefinition.sockets.socketEntries;
    const plugItemHashes: number[][] = [];

    // The values in `itemDefinition.sockets[].socketCategories[].socketIndexes`
    // are also indices but for the  `itemDefinition.sockets[].socketEntries`
    // array.
    // However, from the "outside", we want the consumer to be able to just
    // say "give me plug hashes for socket index 1", where that `1` referred to
    // the index of `socketCategories[].socketIndexes`. This way, form the
    // outside world doesn't have to know about the internal index values.
    for (
      let socketEntryIndexIndex = 0;
      socketEntryIndexIndex < socketIndices.length;
      socketEntryIndexIndex++
    ) {
      const socketEntryIndex = socketIndices[socketEntryIndexIndex];
      const socketEntry = itemDefinitionSocketEntries[socketEntryIndex];
      const socketEntryPlugSources = socketEntry.plugSources;

      const hasLocalPlugs = !!(socketEntryPlugSources & SocketPlugSources.ReusablePlugItems);
      const hasProfilePlugs = !!(socketEntryPlugSources & SocketPlugSources.ProfilePlugSet);
      const hasCharacterPlugs = !!(socketEntryPlugSources & SocketPlugSources.CharacterPlugSet);

      const plugHashes: number[] = [];

      if (socketEntry.singleInitialItemHash) {
        plugHashes.push(socketEntry.singleInitialItemHash);
      }

      if (hasLocalPlugs) {
        (socketEntry.reusablePlugItems || []).forEach((item) => {
          plugHashes.push(item.plugItemHash);
        });
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

        (profileCharacterPlugItemHashes || []).forEach((plugHash) => {
          plugHashes.push(plugHash);
        });
      }

      // Use `socketEntryIndexIndex` because that's the external index.
      plugItemHashes[socketEntryIndexIndex] = plugHashes.filter(
        (value, index, array) => index === array.indexOf(value)
      );
    }

    return [null, plugItemHashes];
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
    const [profileErr, profileRes] = await this.bungieApiService.sendApiRequest<
      null,
      DestinyProfileResponse
    >(
      sessionId,
      "GET",
      `/Destiny2/${membershipType}/Profile/${membershipId}?components=${DestinyComponentType.ItemSockets}`,
      null
    );
    if (profileErr) {
      return [profileErr, null];
    }

    const profilePlugSets = profileRes?.profilePlugSets?.data?.plugs || {};
    const characterPlugSets = (profileRes?.characterPlugSets?.data || {})[characterId]?.plugs || {};

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
      .getLogger("Destiny2PlugService");
  }
}
