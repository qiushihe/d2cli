import { SOCKET_TYPE_INTRINSIC_TRAITS } from "~src/enum/socket.enum";
import { cachedGetter } from "~src/helper/cache.helper";
import { minutesInMilliseconds } from "~src/helper/time.helper";
import { CacheService } from "~src/service/cache/cache.service";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { InventoryService } from "~src/service/inventory/inventory.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import {
  DestinyDamageTypeDefinition,
  DestinyInventoryItemDefinition
} from "~type/bungie-api/destiny/definitions.types";
import {
  DestinyItemComponent,
  DestinyItemInstanceComponent
} from "~type/bungie-api/destiny/entities/items.types";

import { InventoryItem } from "./type";

const CACHE_NS = "inventory:data-getter";

export const dataGetter =
  (
    logger: Logger,
    manifestDefinitionService: ManifestDefinitionService,
    cacheService: CacheService,
    characterService: CharacterService,
    characterDescriptionService: CharacterDescriptionService,
    inventoryService: InventoryService
  ) =>
  async (
    sessionId: string
  ): Promise<
    | [Error, null]
    | [
        null,
        {
          inventoryItems: InventoryItem[];
          itemInstances: Record<string, DestinyItemInstanceComponent>;
          itemDefinitions: Record<string, DestinyInventoryItemDefinition>;
          intrinsicItemDefinitions: Record<string, DestinyInventoryItemDefinition>;
          damageTypeDefinitions: Record<string, DestinyDamageTypeDefinition>;
        }
      ]
  > => {
    const cachedGet = cachedGetter(cacheService);

    logger.info("Retrieving characters ...");
    const [charactersErr, characters] = await cachedGet(
      () => characterService.getCharacters(sessionId),
      CACHE_NS,
      `characters-${sessionId}`,
      minutesInMilliseconds(5)
    );
    if (charactersErr) {
      return [logger.loggedError(`Unable to get characters: ${charactersErr.message}`), null];
    }
    if (characters.length <= 0) {
      return [logger.loggedError("Missing characters"), null];
    }

    logger.info("Retrieving character descriptions ...");
    const characterDescriptionById: Record<string, string> = {};
    for (const character of characters) {
      const [characterDescriptionErr, characterDescription] = await cachedGet(
        () => characterDescriptionService.getDescription(character),
        CACHE_NS,
        `character-descriptions-${character.membershipType}-${character.membershipId}-${character.characterId}`,
        minutesInMilliseconds(5)
      );
      if (characterDescriptionErr) {
        return [
          logger.loggedError(
            `Unable to retrieve character description: ${characterDescriptionErr.message}`
          ),
          null
        ];
      }
      characterDescriptionById[character.characterId] = characterDescription.asString;
    }

    const allItems: DestinyItemComponent[] = [];
    const itemInstances: Record<string, DestinyItemInstanceComponent> = {};
    const itemDefinitions: Record<string, DestinyInventoryItemDefinition> = {};
    const intrinsicItemDefinitions: Record<string, DestinyInventoryItemDefinition> = {};
    const damageTypeDefinitions: Record<string, DestinyDamageTypeDefinition> = {};

    for (const character of characters) {
      const characterDescription = characterDescriptionById[character.characterId];

      logger.info(`Retrieving equipment items for ${characterDescription} ...`);
      const [equipmentItemsErr, equipmentItems] = await cachedGet(
        () =>
          inventoryService.getEquipmentItems(
            sessionId,
            character.membershipType,
            character.membershipId,
            character.characterId
          ),
        CACHE_NS,
        `equipment-items-${character.membershipType}-${character.membershipId}-${character.characterId}`,
        minutesInMilliseconds(1)
      );
      if (equipmentItemsErr) {
        return [
          logger.loggedError(
            `Unable to retrieve equipment items for ${characterDescription}: ${equipmentItemsErr.message}`
          ),
          null
        ];
      }
      allItems.push(...equipmentItems.components);
      Object.assign(itemInstances, equipmentItems.instances);

      logger.info(`Retrieving inventory items for ${characterDescription} ...`);
      const [inventoryItemsErr, inventoryItems] = await cachedGet(
        () =>
          inventoryService.getInventoryItems(
            sessionId,
            character.membershipType,
            character.membershipId,
            character.characterId
          ),
        CACHE_NS,
        `inventory-items-${character.membershipType}-${character.membershipId}-${character.characterId}`,
        minutesInMilliseconds(1)
      );
      if (inventoryItemsErr) {
        return [
          logger.loggedError(
            `Unable to retrieve inventory items for ${characterDescription}: ${inventoryItemsErr.message}`
          ),
          null
        ];
      }
      allItems.push(...inventoryItems.components);
      Object.assign(itemInstances, inventoryItems.instances);
    }

    logger.info("Retrieving vault items ...");
    const [vaultItemsErr, vaultItems] = await cachedGet(
      () =>
        inventoryService.getVaultItems(
          sessionId,
          characters[0].membershipType,
          characters[0].membershipId
        ),
      CACHE_NS,
      `vault-items-${characters[0].membershipType}-${characters[0].membershipId}`,
      minutesInMilliseconds(1)
    );
    if (vaultItemsErr) {
      return [logger.loggedError(`Unable to retrieve vault items: ${vaultItemsErr.message}`), null];
    }
    allItems.push(...vaultItems.components);
    Object.assign(itemInstances, vaultItems.instances);

    logger.info("Retrieving item definitions ...");
    for (const item of allItems) {
      const [itemDefinitionErr, itemDefinition] = await manifestDefinitionService.getItemDefinition(
        item.itemHash
      );
      if (itemDefinitionErr) {
        return [
          logger.loggedError(
            `Unable to retrieve item definition for ${item.itemHash}: ${itemDefinitionErr.message}`
          ),
          null
        ];
      }
      itemDefinitions[`${item.itemHash}:${item.itemInstanceId || ""}`] = itemDefinition;

      // Intrinsic trait item definition
      // ------------------------------------------------------------------------------------------

      const intrinsicTraitSocket = (itemDefinition.sockets?.socketEntries || []).find(
        ({ socketTypeHash }) => socketTypeHash === SOCKET_TYPE_INTRINSIC_TRAITS
      );
      if (intrinsicTraitSocket) {
        const [socketItemDefinitionErr, socketItemDefinition] =
          await manifestDefinitionService.getItemDefinition(
            intrinsicTraitSocket.singleInitialItemHash
          );
        if (socketItemDefinitionErr) {
          return [
            logger.loggedError(
              `Unable to retrieve item intrinsic trait socket for item definition for ${item.itemHash}: ${socketItemDefinitionErr.message}`
            ),
            null
          ];
        }
        intrinsicItemDefinitions[`${socketItemDefinition.hash}:`] = socketItemDefinition;

        // Damage type item definition
        // ------------------------------------------------------------------------------------------

        // Although the data structure for damage type is an array (for some reason), it only ever
        // has 1 value. So we're just taking the 1st value out of the array.
        const damageTypeHash = (itemDefinition.damageTypeHashes || [])[0];
        if (damageTypeHash) {
          const [damageTypeDefinitionErr, damageTypeDefinition] =
            await manifestDefinitionService.getDamageTypeDefinition(damageTypeHash);
          if (damageTypeDefinitionErr) {
            return [
              logger.loggedError(
                `Unable to retrieve item damage type definition for ${item.itemHash}: ${damageTypeDefinitionErr.message}`
              ),
              null
            ];
          }
          damageTypeDefinitions[item.itemHash] = damageTypeDefinition;
        }
      }
    }

    const inventoryItems: InventoryItem[] = Object.entries(itemDefinitions).map(([key]) => {
      const identifiers = key.split(":", 2);
      const itemHash = parseInt(identifiers[0], 10);
      const itemInstanceId = identifiers[1];

      return { itemHash, itemInstanceId, tags: [] };
    });

    return [
      null,
      {
        inventoryItems,
        itemInstances,
        itemDefinitions,
        intrinsicItemDefinitions,
        damageTypeDefinitions
      }
    ];
  };
