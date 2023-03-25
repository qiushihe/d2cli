import { ItemService } from "~src/service/item/item.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PlugService } from "~src/service/plug/plug.service";
import { SocketName } from "~src/service/plug/plug.service.types";

export const SUBCLASS_SOCKET_NAMES = ["ABILITIES", "SUPER", "ASPECTS", "FRAGMENTS"];

export type LoadoutPlugRecord = {
  itemHash: number;
  socketIndex: number;
};

export const getLoadoutPlugRecords = async (
  logger: Logger,
  manifestDefinitionService: ManifestDefinitionService,
  itemService: ItemService,
  plugService: PlugService,
  sessionId: string,
  membershipType: number,
  membershipId: string,
  characterId: string,
  itemHash: number,
  itemInstanceId: string,
  socketNames: string[]
): Promise<[Error, null] | [null, LoadoutPlugRecord[]]> => {
  logger.info(`Retrieving item definition for ${itemHash} ...`);
  const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
    itemHash
  );
  if (itemDefinitionErr) {
    return [
      logger.loggedError(
        `Unable to fetch item definition for ${itemHash}: ${itemDefinitionErr.message}`
      ),
      null
    ];
  }

  const itemName = itemDefinition?.displayProperties.name || "UNKNOWN ITEM";
  const plugRecords: LoadoutPlugRecord[] = [];

  logger.info(`Retrieving ${itemName} equipped plug hashes ...`);
  const [equippedPlugHashesErr, equippedPlugHashes] = await itemService.getItemEquippedPlugHashes(
    sessionId,
    membershipType,
    membershipId,
    itemInstanceId
  );
  if (equippedPlugHashesErr) {
    return [
      logger.loggedError(
        `Unable to retrieve ${itemName} equipped plug hashes: ${equippedPlugHashesErr.message}`
      ),
      null
    ];
  }

  for (let socketNameIndex = 0; socketNameIndex < socketNames.length; socketNameIndex++) {
    const socketName = socketNames[socketNameIndex] as SocketName;

    logger.info(`Fetching ${itemName} ${socketName.toLocaleLowerCase()} socket indices ...`);
    const [socketIndicesErr, socketIndices] = await plugService.getSocketIndices(
      sessionId,
      membershipType,
      membershipId,
      characterId,
      itemHash,
      socketName
    );
    if (socketIndicesErr) {
      return [
        logger.loggedError(
          `Unable to fetch ${socketName.toLocaleLowerCase()} socket indices for ${itemName}: ${
            socketIndicesErr.message
          }`
        ),
        null
      ];
    }

    for (let index = 0; index < socketIndices.length; index++) {
      const socketIndex = socketIndices[index];
      const equippedPlugItemHash = equippedPlugHashes[socketIndex] || -1;

      plugRecords.push({ socketIndex, itemHash: equippedPlugItemHash });
    }
  }

  return [null, plugRecords];
};
