import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { showAllOption } from "~src/cli/command-option/cli.option";
import { ShowAllCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { getSubclassItems } from "~src/helper/inventory-bucket.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2InventoryService } from "~src/service/destiny2-inventory/destiny2-inventory.service";
import { Destiny2ItemService } from "~src/service/destiny2-item/destiny2-item.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2PlugService } from "~src/service/destiny2-plug/destiny2-plug.service";
import { SocketName } from "~src/service/destiny2-plug/destiny2-plug.service.types";
import { LogService } from "~src/service/log/log.service";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestInventoryItemDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions & ShowAllCommandOptions;

type SubclassPlugRecord = {
  name: string;
  itemHash: number;
  isEquipped: boolean;
  socketIndex: number;
  sortOrder: number;
};

type SubclassRecord = {
  name: string;
  itemHash: number;
  itemInstanceId: string;
  sockets: Record<string, SubclassPlugRecord[][]>;
};

type ListCommandOptions = {
  listEquipped: boolean;
};

const SOCKET_NAMES = ["ABILITIES", "SUPER", "ASPECTS", "FRAGMENTS"];

export const listCommand = (options: ListCommandOptions): CommandDefinition => {
  return {
    description: `List ${
      options.listEquipped ? "equipped subclass" : "unequipped subclasses"
    } of the current character`,
    options: [sessionIdOption, verboseOption, showAllOption],
    action: async (_, opts) => {
      const logger = AppModule.getDefaultInstance()
        .resolve<LogService>("LogService")
        .getLogger(`cmd:subclass:${options.listEquipped ? "equipped" : "unequipped"}`);

      const { session: sessionId, verbose, showAll } = opts as CmdOptions;
      logger.debug(`Session ID: ${sessionId}`);

      const destiny2ManifestService =
        AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

      const destiny2InventoryService =
        AppModule.getDefaultInstance().resolve<Destiny2InventoryService>(
          "Destiny2InventoryService"
        );

      const destiny2PlugService =
        AppModule.getDefaultInstance().resolve<Destiny2PlugService>("Destiny2PlugService");

      const destiny2ItemService =
        AppModule.getDefaultInstance().resolve<Destiny2ItemService>("Destiny2ItemService");

      const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
      if (characterInfoErr) {
        return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
      }

      const [itemDefinitionsErr, itemDefinitions] = await fnWithSpinner(
        "Retrieving inventory item definitions ...",
        () =>
          destiny2ManifestService.getManifestComponent<Destiny2ManifestInventoryItemDefinitions>(
            Destiny2ManifestLanguage.English,
            Destiny2ManifestComponent.InventoryItemDefinition
          )
      );
      if (itemDefinitionsErr) {
        return logger.loggedError(
          `Unable to retrieve inventory item definitions: ${itemDefinitionsErr.message}`
        );
      }

      const subclassRecords: SubclassRecord[] = [];
      const allSubclasses: DestinyItemComponent[] = [];

      if (options.listEquipped) {
        const [equipmentItemsErr, equipmentItems] = await fnWithSpinner(
          "Retrieving equipment items ...",
          () =>
            destiny2InventoryService.getEquipmentItems(
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              characterInfo.characterId
            )
        );
        if (equipmentItemsErr) {
          return logger.loggedError(
            `Unable to retrieve equipment items: ${equipmentItemsErr.message}`
          );
        }
        getSubclassItems(equipmentItems).forEach((subclass) => allSubclasses.push(subclass));
      } else {
        const [inventoryItemsErr, inventoryItems] = await fnWithSpinner(
          "Retrieving inventory items ...",
          () =>
            destiny2InventoryService.getInventoryItems(
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              characterInfo.characterId
            )
        );
        if (inventoryItemsErr) {
          return logger.loggedError(
            `Unable to retrieve inventory items: ${inventoryItemsErr.message}`
          );
        }
        getSubclassItems(inventoryItems).forEach((subclass) => allSubclasses.push(subclass));
      }

      for (let subClassIndex = 0; subClassIndex < allSubclasses.length; subClassIndex++) {
        const subclass = allSubclasses[subClassIndex];

        const subclassDefinition = itemDefinitions[subclass.itemHash];
        const subclassName = subclassDefinition ? subclassDefinition.displayProperties.name : "N/A";

        const subclassRecord: SubclassRecord = {
          name: subclassName,
          itemHash: subclass.itemHash,
          itemInstanceId: subclass.itemInstanceId,
          sockets: {}
        };

        const [equippedPlugHashesErr, equippedPlugHashes] = await fnWithSpinner(
          `Retrieving ${subclassName} equipped plug hashes ...`,
          () =>
            destiny2ItemService.getItemEquippedPlugHashes(
              sessionId,
              characterInfo.membershipType,
              characterInfo.membershipId,
              subclass.itemInstanceId
            )
        );
        if (equippedPlugHashesErr) {
          return logger.loggedError(
            `Unable to retrieve ${subclassName} equipped plug hashes: ${equippedPlugHashesErr.message}`
          );
        }

        for (let socketNameIndex = 0; socketNameIndex < SOCKET_NAMES.length; socketNameIndex++) {
          const socketName = SOCKET_NAMES[socketNameIndex] as SocketName;

          const [socketIndicesErr, socketIndices] = await fnWithSpinner(
            `Fetching ${subclassName} ${socketName.toLocaleLowerCase()} socket indices ...`,
            () =>
              destiny2PlugService.getSocketIndices(
                sessionId,
                characterInfo.membershipType,
                characterInfo.membershipId,
                characterInfo.characterId,
                subclass.itemHash,
                socketName
              )
          );
          if (socketIndicesErr) {
            return logger.loggedError(
              `Unable to fetch ${socketName.toLocaleLowerCase()} socket indices for ${subclassName}: ${
                socketIndicesErr.message
              }`
            );
          }

          const [plugItemHashesErr, plugItemHashes] = await fnWithSpinner(
            `Retrieving ${subclassName} available ${socketName.toLocaleLowerCase()} items ...`,
            () =>
              destiny2PlugService.getPlugItemHashes(
                sessionId,
                characterInfo.membershipType,
                characterInfo.membershipId,
                characterInfo.characterId,
                subclass.itemHash,
                socketName
              )
          );
          if (plugItemHashesErr) {
            return logger.loggedError(
              `Unable to retrieve ${subclassName} available ${socketName.toLocaleLowerCase()} items: ${
                plugItemHashesErr.message
              }`
            );
          }

          subclassRecord.sockets[socketName] = [];

          for (let index = 0; index < socketIndices.length; index++) {
            const socketIndex = socketIndices[index];
            const slotPlugRecords: SubclassPlugRecord[] = [];
            const slotPlugItemHashes = plugItemHashes[index];
            const equippedPlugItemHash = equippedPlugHashes[socketIndex] || -1;

            for (
              let plugItemIndex = 0;
              plugItemIndex < slotPlugItemHashes.length;
              plugItemIndex++
            ) {
              const plugItemHash = slotPlugItemHashes[plugItemIndex];
              const plugItemDefinition = itemDefinitions[plugItemHash];

              const plugRecord: SubclassPlugRecord = {
                name: plugItemDefinition
                  ? plugItemDefinition.displayProperties.name
                  : `Plug: ${plugItemHash}`,
                itemHash: plugItemHash,
                isEquipped: equippedPlugItemHash === plugItemHash,
                socketIndex,
                sortOrder: plugItemDefinition.index
              };

              slotPlugRecords.push(plugRecord);
            }

            subclassRecord.sockets[socketName].push(slotPlugRecords);
          }
        }

        subclassRecords.push(subclassRecord);
      }

      const tableData: string[][] = [];

      const tableHeader: string[] = ["Name", "Slot", "Equipped"];
      if (verbose) {
        tableHeader.push("ID");
      }
      if (showAll) {
        tableHeader.push("Unequipped");
        if (verbose) {
          tableHeader.push("ID");
        }
      }
      tableData.push(tableHeader);

      subclassRecords.forEach((subclassRecord) => {
        const subClassColumns = ["Subclass", "", subclassRecord.name];
        if (verbose) {
          subClassColumns.push(`${subclassRecord.itemHash}:${subclassRecord.itemInstanceId}`);
        }
        if (showAll) {
          subClassColumns.push("");
          if (verbose) {
            subClassColumns.push("");
          }
        }
        tableData.push(subClassColumns);

        const equippedSuper =
          subclassRecord.sockets["SUPER"].flat().find((superRecord) => superRecord.isEquipped) ||
          null;
        if (equippedSuper) {
          const superColumns = ["Super", `${equippedSuper.socketIndex + 1}`, equippedSuper.name];
          if (verbose) {
            superColumns.push(`${equippedSuper.itemHash}`);
          }
          if (showAll) {
            const unequippedSupers = subclassRecord.sockets["SUPER"]
              .flat()
              .filter((superRecord) => !superRecord.isEquipped)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            superColumns.push(unequippedSupers.map((superRecord) => superRecord.name).join("\n"));
            if (verbose) {
              superColumns.push(
                unequippedSupers.map((superRecord) => `${superRecord.itemHash}`).join("\n")
              );
            }
          }

          tableData.push(superColumns);
        }

        const equippedClassAbility = (subclassRecord.sockets["ABILITIES"][0] || []).find(
          (abilityRecord) => abilityRecord.isEquipped
        );
        if (equippedClassAbility) {
          const classAbilityColumns = [
            "Class Ability",
            `${equippedClassAbility.socketIndex + 1}`,
            equippedClassAbility.name
          ];
          if (verbose) {
            classAbilityColumns.push(`${equippedClassAbility.itemHash}`);
          }
          if (showAll) {
            const unequippedClassAbility = (subclassRecord.sockets["ABILITIES"][0] || [])
              .filter((abilityRecord) => !abilityRecord.isEquipped)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            classAbilityColumns.push(
              unequippedClassAbility.map((abilityRecord) => abilityRecord.name).join("\n")
            );
            if (verbose) {
              classAbilityColumns.push(
                unequippedClassAbility
                  .map((abilityRecord) => `${abilityRecord.itemHash}`)
                  .join("\n")
              );
            }
          }

          tableData.push(classAbilityColumns);
        }

        const equippedMovementAbility = (subclassRecord.sockets["ABILITIES"][1] || []).find(
          (abilityRecord) => abilityRecord.isEquipped
        );
        if (equippedMovementAbility) {
          const movementAbilityColumns = [
            "Movement",
            `${equippedMovementAbility.socketIndex + 1}`,
            equippedMovementAbility.name
          ];
          if (verbose) {
            movementAbilityColumns.push(`${equippedMovementAbility.itemHash}`);
          }
          if (showAll) {
            const unequippedMovementAbility = (subclassRecord.sockets["ABILITIES"][1] || [])
              .filter((abilityRecord) => !abilityRecord.isEquipped)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            movementAbilityColumns.push(
              unequippedMovementAbility.map((abilityRecord) => abilityRecord.name).join("\n")
            );
            if (verbose) {
              movementAbilityColumns.push(
                unequippedMovementAbility
                  .map((abilityRecord) => `${abilityRecord.itemHash}`)
                  .join("\n")
              );
            }
          }

          tableData.push(movementAbilityColumns);
        }

        const equippedMeleeAbility = (subclassRecord.sockets["ABILITIES"][2] || []).find(
          (abilityRecord) => abilityRecord.isEquipped
        );
        if (equippedMeleeAbility) {
          const meleeAbilityColumns = [
            "Melee",
            `${equippedMeleeAbility.socketIndex + 1}`,
            equippedMeleeAbility.name
          ];
          if (verbose) {
            meleeAbilityColumns.push(`${equippedMeleeAbility.itemHash}`);
          }
          if (showAll) {
            const unequippedMeleeAbility = (subclassRecord.sockets["ABILITIES"][2] || [])
              .filter((abilityRecord) => !abilityRecord.isEquipped)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            meleeAbilityColumns.push(
              unequippedMeleeAbility.map((abilityRecord) => abilityRecord.name).join("\n")
            );
            if (verbose) {
              meleeAbilityColumns.push(
                unequippedMeleeAbility
                  .map((abilityRecord) => `${abilityRecord.itemHash}`)
                  .join("\n")
              );
            }
          }

          tableData.push(meleeAbilityColumns);
        }

        const equippedGrenadeAbility = (subclassRecord.sockets["ABILITIES"][3] || []).find(
          (abilityRecord) => abilityRecord.isEquipped
        );
        if (equippedGrenadeAbility) {
          const grenadeAbilityColumns = [
            "Grenade",
            `${equippedGrenadeAbility.socketIndex + 1}`,
            equippedGrenadeAbility.name
          ];
          if (verbose) {
            grenadeAbilityColumns.push(`${equippedGrenadeAbility.itemHash}`);
          }
          if (showAll) {
            const unequippedGrenadeAbility = (subclassRecord.sockets["ABILITIES"][3] || [])
              .filter((abilityRecord) => !abilityRecord.isEquipped)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            grenadeAbilityColumns.push(
              unequippedGrenadeAbility.map((abilityRecord) => abilityRecord.name).join("\n")
            );
            if (verbose) {
              grenadeAbilityColumns.push(
                unequippedGrenadeAbility
                  .map((abilityRecord) => `${abilityRecord.itemHash}`)
                  .join("\n")
              );
            }
          }

          tableData.push(grenadeAbilityColumns);
        }

        const equippedAspects = subclassRecord.sockets["ASPECTS"]
          .flat()
          .filter((aspectRecord) => aspectRecord.isEquipped)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const aspectsColumns = [
          "Aspects",
          `${equippedAspects[0].socketIndex + 1}`,
          equippedAspects.map((aspectRecord) => aspectRecord.name).join("\n")
        ];
        if (verbose) {
          aspectsColumns.push(
            equippedAspects.map((aspectRecord) => `${aspectRecord.itemHash}`).join("\n")
          );
        }
        if (showAll) {
          const equippedAspectHashes = equippedAspects.map((aspectRecord) => aspectRecord.itemHash);
          const unequippedAspects = Object.values(
            subclassRecord.sockets["ASPECTS"]
              .flat()
              .filter(
                (aspectRecord) =>
                  !aspectRecord.isEquipped && !equippedAspectHashes.includes(aspectRecord.itemHash)
              )
              .reduce(
                (acc, record) => ({ ...acc, [record.itemHash]: record }),
                {} as Record<number, SubclassPlugRecord>
              )
          ).sort((a, b) => a.sortOrder - b.sortOrder);
          aspectsColumns.push(
            unequippedAspects.map((aspectRecord) => aspectRecord.name).join("\n")
          );
          if (verbose) {
            aspectsColumns.push(
              unequippedAspects.map((aspectRecord) => `${aspectRecord.itemHash}`).join("\n")
            );
          }
        }
        tableData.push(aspectsColumns);

        const equippedFragments = subclassRecord.sockets["FRAGMENTS"]
          .flat()
          .filter((fragmentRecord) => fragmentRecord.isEquipped)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const fragmentsColumns = [
          "Fragments",
          `${equippedFragments[0].socketIndex + 1}`,
          equippedFragments.map((fragmentRecord) => fragmentRecord.name).join("\n")
        ];
        if (verbose) {
          fragmentsColumns.push(
            equippedFragments.map((fragmentRecord) => `${fragmentRecord.itemHash}`).join("\n")
          );
        }
        if (showAll) {
          const equippedFragmentHashes = equippedFragments.map(
            (aspectRecord) => aspectRecord.itemHash
          );
          const unequippedFragments = Object.values(
            subclassRecord.sockets["FRAGMENTS"]
              .flat()
              .filter(
                (fragmentRecord) =>
                  !fragmentRecord.isEquipped &&
                  !equippedFragmentHashes.includes(fragmentRecord.itemHash)
              )
              .reduce(
                (acc, record) => ({ ...acc, [record.itemHash]: record }),
                {} as Record<number, SubclassPlugRecord>
              )
          ).sort((a, b) => a.sortOrder - b.sortOrder);
          fragmentsColumns.push(
            unequippedFragments.map((fragmentRecord) => fragmentRecord.name).join("\n")
          );
          if (verbose) {
            fragmentsColumns.push(
              unequippedFragments.map((fragmentRecord) => `${fragmentRecord.itemHash}`).join("\n")
            );
          }
        }
        tableData.push(fragmentsColumns);
      });

      logger.log(stringifyTable(tableData));
    }
  };
};
