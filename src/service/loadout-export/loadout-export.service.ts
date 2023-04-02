import { ArmourBucketHashes, WeaponBucketHashes } from "~src/enum/inventory.enum";
import { SUBCLASS_SOCKET_NAMES } from "~src/enum/loadout.enum";
import { ARMOUR_SOCKET_NAMES } from "~src/enum/loadout.enum";
import { WEAPON_SOCKET_NAMES } from "~src/enum/loadout.enum";
import { getSubclassItems } from "~src/helper/inventory-bucket.helper";
import { AppModule } from "~src/module/app.module";
import { resolveCharacterItems } from "~src/service/destiny2-component-data/character.resolver";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { PlugService } from "~src/service/plug/plug.service";
import { SocketName } from "~src/service/plug/plug.service.types";
import { DestinyItemSocketsComponent } from "~type/bungie-api/destiny/entities/items.types";

import { ExportedItem } from "./loadout-export.types";
import { ExportedPlug } from "./loadout-export.types";

export class LoadoutExportService {
  private readonly manifestDefinitionService: ManifestDefinitionService;
  private readonly destiny2ComponentDataService: Destiny2ComponentDataService;
  private readonly plugService: PlugService;

  constructor() {
    this.manifestDefinitionService =
      AppModule.getDefaultInstance().resolve(ManifestDefinitionService);

    this.destiny2ComponentDataService = AppModule.getDefaultInstance().resolve(
      Destiny2ComponentDataService
    );

    this.plugService = AppModule.getDefaultInstance().resolve(PlugService);
  }

  serializeExportedItems(loadoutName: string, exportedItems: ExportedItem[]): [string, string] {
    const loadoutLinesGroups: string[][] = [];

    const exportedLoadoutName = loadoutName || "Exported Loadout";
    loadoutLinesGroups.push([`LOADOUT // ${exportedLoadoutName}`]);

    exportedItems
      .filter((item) => item.type === "SUBCLASS")
      .forEach((item) => {
        const loadoutSubclassGroup: string[] = [];

        loadoutSubclassGroup.push(
          `EQUIP // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );

        item.plugs.forEach((plug) => {
          loadoutSubclassGroup.push(
            `SOCKET // ${item.itemHash}:${item.itemInstanceId}::index:${plug.socketIndex}::plug:${plug.itemHash} // ${plug.itemName}`
          );
        });

        loadoutLinesGroups.push(loadoutSubclassGroup);
      });

    const loadoutWeaponsGroup: string[] = [];

    exportedItems
      .filter((item) => !item.isExtra && item.type === "WEAPON")
      .forEach((item) => {
        loadoutWeaponsGroup.push(
          `EQUIP // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );
      });

    loadoutLinesGroups.push(loadoutWeaponsGroup);

    exportedItems
      .filter((item) => !item.isExtra && item.type === "ARMOUR")
      .forEach((item) => {
        const loadoutArmourGroup: string[] = [];

        loadoutArmourGroup.push(
          `EQUIP // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );

        item.plugs.forEach((plug) => {
          loadoutArmourGroup.push(
            `SOCKET // ${item.itemHash}:${item.itemInstanceId}::index:${plug.socketIndex}::plug:${plug.itemHash} // ${plug.itemName}`
          );
        });

        loadoutLinesGroups.push(loadoutArmourGroup);
      });

    const loadoutExtraWeaponsGroup: string[] = [];

    exportedItems
      .filter((item) => item.isExtra && item.type === "WEAPON")
      .forEach((item) => {
        loadoutExtraWeaponsGroup.push(
          `EXTRA // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );
      });

    loadoutLinesGroups.push(loadoutExtraWeaponsGroup);

    exportedItems
      .filter((item) => item.isExtra && item.type === "ARMOUR")
      .forEach((item) => {
        const loadoutExtraArmourGroup: string[] = [];

        loadoutExtraArmourGroup.push(
          `EXTRA // ${item.itemHash}:${item.itemInstanceId} // ${item.itemName}`
        );

        item.plugs.forEach((plug) => {
          loadoutExtraArmourGroup.push(
            `SOCKET // ${item.itemHash}:${item.itemInstanceId}::index:${plug.socketIndex}::plug:${plug.itemHash} // ${plug.itemName}`
          );
        });

        loadoutLinesGroups.push(loadoutExtraArmourGroup);
      });

    return [
      exportedLoadoutName,
      loadoutLinesGroups
        .filter((loadoutLinesGroup) => loadoutLinesGroup.length > 0)
        .map((loadoutLinesGroup) => loadoutLinesGroup.join("\n"))
        .join("\n\n")
    ];
  }

  async exportLoadout(
    sessionId: string,
    membershipType: number,
    membershipId: string,
    characterId: string,
    includeUnequipped: boolean
  ): Promise<[Error, null] | [null, ExportedItem[]]> {
    const [characterItemsErr, characterItems] =
      await this.destiny2ComponentDataService.getCharacterComponentsData(
        sessionId,
        membershipType,
        membershipId,
        characterId,
        resolveCharacterItems
      );
    if (characterItemsErr) {
      return [characterItemsErr, null];
    }

    const exportedItems: ExportedItem[] = [];

    const subclass = getSubclassItems(characterItems.equipped)[0];
    if (!subclass) {
      return [new Error("Unable to find character subclass items"), null];
    }

    const [exportedSubclassPlugsErr, exportedSubclassPlugs] = await this.exportItemPlugs(
      characterItems.sockets,
      subclass.itemHash,
      subclass.itemInstanceId,
      SUBCLASS_SOCKET_NAMES
    );
    if (exportedSubclassPlugsErr) {
      return [exportedSubclassPlugsErr, null];
    }

    const [subclassDefinitionErr, subclassDefinition] =
      await this.manifestDefinitionService.getItemDefinition(subclass.itemHash);
    if (subclassDefinitionErr) {
      return [subclassDefinitionErr, null];
    }

    exportedItems.push({
      type: "SUBCLASS",
      isExtra: false,
      itemHash: subclass.itemHash,
      itemInstanceId: subclass.itemInstanceId,
      itemName: subclassDefinition?.displayProperties.name || "UNKNOWN SUBCLASS",
      plugs: exportedSubclassPlugs
    });

    for (
      let weaponBucketIndex = 0;
      weaponBucketIndex < WeaponBucketHashes.length;
      weaponBucketIndex++
    ) {
      const bucketHash = WeaponBucketHashes[weaponBucketIndex];

      for (
        let equippedItemIndex = 0;
        equippedItemIndex < characterItems.equipped.length;
        equippedItemIndex++
      ) {
        const item = characterItems.equipped[equippedItemIndex];
        if (item.bucketHash === bucketHash) {
          const [exportedWeaponPlugsErr, exportedWeaponPlugs] = await this.exportItemPlugs(
            characterItems.sockets,
            item.itemHash,
            item.itemInstanceId,
            WEAPON_SOCKET_NAMES
          );
          if (exportedWeaponPlugsErr) {
            return [exportedWeaponPlugsErr, null];
          }

          const [weaponDefinitionErr, weaponDefinition] =
            await this.manifestDefinitionService.getItemDefinition(item.itemHash);
          if (weaponDefinitionErr) {
            return [weaponDefinitionErr, null];
          }

          exportedItems.push({
            type: "WEAPON",
            isExtra: false,
            itemHash: item.itemHash,
            itemInstanceId: item.itemInstanceId,
            itemName: weaponDefinition?.displayProperties.name || "UNKNOWN WEAPON",
            plugs: exportedWeaponPlugs
          });
        }
      }

      if (includeUnequipped) {
        for (
          let unequippedItemIndex = 0;
          unequippedItemIndex < characterItems.unequipped.length;
          unequippedItemIndex++
        ) {
          const item = characterItems.unequipped[unequippedItemIndex];
          if (item.bucketHash === bucketHash) {
            const [exportedWeaponPlugsErr, exportedWeaponPlugs] = await this.exportItemPlugs(
              characterItems.sockets,
              item.itemHash,
              item.itemInstanceId,
              WEAPON_SOCKET_NAMES
            );
            if (exportedWeaponPlugsErr) {
              return [exportedWeaponPlugsErr, null];
            }

            const [weaponDefinitionErr, weaponDefinition] =
              await this.manifestDefinitionService.getItemDefinition(item.itemHash);
            if (weaponDefinitionErr) {
              return [weaponDefinitionErr, null];
            }

            exportedItems.push({
              type: "WEAPON",
              isExtra: true,
              itemHash: item.itemHash,
              itemInstanceId: item.itemInstanceId,
              itemName: weaponDefinition?.displayProperties.name || "UNKNOWN WEAPON",
              plugs: exportedWeaponPlugs
            });
          }
        }
      }
    }

    for (
      let armourBucketIndex = 0;
      armourBucketIndex < ArmourBucketHashes.length;
      armourBucketIndex++
    ) {
      const bucketHash = ArmourBucketHashes[armourBucketIndex];

      for (
        let equippedItemIndex = 0;
        equippedItemIndex < characterItems.equipped.length;
        equippedItemIndex++
      ) {
        const item = characterItems.equipped[equippedItemIndex];
        if (item.bucketHash === bucketHash) {
          const [exportedArmourPlugsErr, exportedArmourPlugs] = await this.exportItemPlugs(
            characterItems.sockets,
            item.itemHash,
            item.itemInstanceId,
            ARMOUR_SOCKET_NAMES
          );
          if (exportedArmourPlugsErr) {
            return [exportedArmourPlugsErr, null];
          }

          const [armourDefinitionErr, armourDefinition] =
            await this.manifestDefinitionService.getItemDefinition(item.itemHash);
          if (armourDefinitionErr) {
            return [armourDefinitionErr, null];
          }

          exportedItems.push({
            type: "ARMOUR",
            isExtra: false,
            itemHash: item.itemHash,
            itemInstanceId: item.itemInstanceId,
            itemName: armourDefinition?.displayProperties.name || "UNKNOWN ARMOUR",
            plugs: exportedArmourPlugs
          });
        }
      }

      if (includeUnequipped) {
        for (
          let unequippedItemIndex = 0;
          unequippedItemIndex < characterItems.unequipped.length;
          unequippedItemIndex++
        ) {
          const item = characterItems.unequipped[unequippedItemIndex];
          if (item.bucketHash === bucketHash) {
            const [exportedArmourPlugsErr, exportedArmourPlugs] = await this.exportItemPlugs(
              characterItems.sockets,
              item.itemHash,
              item.itemInstanceId,
              ["ARMOR MODS"]
            );
            if (exportedArmourPlugsErr) {
              return [exportedArmourPlugsErr, null];
            }

            const [armourDefinitionErr, armourDefinition] =
              await this.manifestDefinitionService.getItemDefinition(item.itemHash);
            if (armourDefinitionErr) {
              return [armourDefinitionErr, null];
            }

            exportedItems.push({
              type: "ARMOUR",
              isExtra: true,
              itemHash: item.itemHash,
              itemInstanceId: item.itemInstanceId,
              itemName: armourDefinition?.displayProperties.name || "UNKNOWN ARMOUR",
              plugs: exportedArmourPlugs
            });
          }
        }
      }
    }

    return [null, exportedItems];
  }

  private async exportItemPlugs(
    itemsSockets: Record<string, DestinyItemSocketsComponent>,
    itemHash: number,
    itemInstanceId: string,
    socketNames: string[]
  ): Promise<[Error, null] | [null, ExportedPlug[]]> {
    if (socketNames.length <= 0) {
      return [null, []];
    }

    const equippedPlugHashes = itemsSockets[itemInstanceId].sockets.map(
      (socket) => socket.plugHash || -1
    );

    const exportedPlugs: ExportedPlug[] = [];

    for (let socketNameIndex = 0; socketNameIndex < socketNames.length; socketNameIndex++) {
      const socketName = socketNames[socketNameIndex] as SocketName;

      const [socketIndicesErr, socketIndices] = await this.plugService.getItemSocketIndices(
        itemHash,
        socketName
      );
      if (socketIndicesErr) {
        return [socketIndicesErr, null];
      }

      for (let index = 0; index < socketIndices.length; index++) {
        const socketIndex = socketIndices[index];
        const socketItemHash = equippedPlugHashes[socketIndex] || -1;

        const [plugDefinitionErr, plugDefinition] =
          await this.manifestDefinitionService.getItemDefinition(socketItemHash);
        if (plugDefinitionErr) {
          return [plugDefinitionErr, null];
        }

        exportedPlugs.push({
          socketIndex,
          itemHash: socketItemHash,
          itemName: plugDefinition?.displayProperties.name || "UNKNOWN PLUG"
        });
      }
    }

    return [null, exportedPlugs];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("LoadoutExportService");
  }
}
