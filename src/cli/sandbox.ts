import { TextGrid } from "~src/helper/text-grid";
import { AppModule } from "~src/module/app.module";
import { BungieApiService } from "~src/service/bungie-api/bungie.api.service";
import { BungieApiComponentType } from "~src/service/bungie-api/bungie-api.types";
import { BungieApiDestiny2Character } from "~src/service/destiny2-character/destiny2-character.types";
import { BungieApiDestiny2InventoryItemLocation } from "~src/service/destiny2-item/destiny2-item.types";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2InventoryBucketDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2InventoryItemDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";

export class ConsoleSandbox {
  async run() {
    const membershipType = 3;
    const membershipId = "4611686018516637277";
    const characterId = "2305843010106844476";

    const bungieApiService =
      AppModule.getDefaultInstance().resolve<BungieApiService>("BungieApiService");

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const [bucketDefinitionErr, bucketDefinition] =
      await destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2InventoryBucketDefinition>(
        BungieApiDestiny2ManifestLanguage.English,
        BungieApiDestiny2ManifestComponent.InventoryBucketDefinition
      );
    if (bucketDefinitionErr) {
      console.log("!!! bucketDefinitionErr", bucketDefinitionErr.message);
    } else {
      const postmasterBucketDefinitions = Object.values(bucketDefinition).filter(
        ({ location }) => location === BungieApiDestiny2InventoryItemLocation.Postmaster
      );
      postmasterBucketDefinitions.forEach((definition) => {
        console.log(`!!! bucket ${definition.hash}: ${definition.displayProperties.name}`);
      });

      const postmasterBucketHashes = postmasterBucketDefinitions.map(
        (definition) => definition.hash
      );
      console.log("!!! postmasterBucketHashes:", postmasterBucketHashes);

      const [characterInventoryErr, characterInventoryRes] = await bungieApiService.sendApiRequest(
        "GET",
        `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}?components=${BungieApiComponentType.CharacterInventories}`,
        null
      );
      if (characterInventoryErr) {
        console.log("!!! characterInventoryErr", characterInventoryErr.message);
      } else {
        const [characterInventoryJsonErr, characterInventoryJson] =
          await bungieApiService.extractApiResponse<BungieApiDestiny2Character>(
            characterInventoryRes
          );
        if (characterInventoryJsonErr) {
          console.log("!!! characterInventoryJsonErr", characterInventoryJsonErr.message);
        } else {
          const [itemDefinitionErr, itemDefinition] =
            await destiny2ManifestService.getDestiny2ManifestComponent<BungieApiDestiny2InventoryItemDefinition>(
              BungieApiDestiny2ManifestLanguage.English,
              BungieApiDestiny2ManifestComponent.InventoryItemDefinition
            );
          if (itemDefinitionErr) {
            console.log("!!! itemDefinitionErr", itemDefinitionErr.message);
          } else {
            const grid = new TextGrid();

            grid.addRow(["Hash", "Instance ID", "Description", "Quantity"]);

            (characterInventoryJson.Response?.inventory?.data.items || [])
              .filter((item) => postmasterBucketHashes.includes(item.bucketHash))
              .forEach((item) => {
                const definition = itemDefinition[item.itemHash];
                grid.addRow([
                  `${item.itemHash}`,
                  item.itemInstanceId,
                  `${definition.displayProperties.name} (${definition.itemTypeAndTierDisplayName})`,
                  `${item.quantity}`
                ]);
              });

            console.log(grid.toString());
          }
        }
      }
    }
  }
}
