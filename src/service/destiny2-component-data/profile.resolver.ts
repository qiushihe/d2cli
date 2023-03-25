import { ComponentDataResolver } from "~src/service/destiny2-component-data/resolver.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyPlugComponent } from "~type/bungie-api/destiny/components/plug-sets.types";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyProfileResponse } from "~type/bungie-api/destiny/responses";

export const resolveProfileCharacters: ComponentDataResolver<
  DestinyProfileResponse,
  DestinyCharacterComponent[]
> = {
  components: [DestinyComponentType.Characters],
  resolve: (res) => {
    return res.characters
      ? [null, Object.values(res.characters.data)]
      : [new Error("Response missing characters attribute"), null];
  }
};

export const resolveProfileAllAvailableSockets: ComponentDataResolver<
  DestinyProfileResponse,
  Record<string, Record<number, DestinyPlugComponent[]>>
> = {
  components: [DestinyComponentType.ItemSockets],
  resolve: (res) => {
    const profilePlugSets = res.profilePlugSets?.data?.plugs || {};
    const charactersPlugSets = res.characterPlugSets?.data || {};

    return [
      null,
      Object.keys(charactersPlugSets).reduce((acc, characterId) => {
        const characterPlugSets = charactersPlugSets[characterId]?.plugs || {};

        return {
          ...acc,
          [characterId]: [...Object.keys(characterPlugSets), ...Object.keys(profilePlugSets)]
            .filter((value, index, array) => index === array.indexOf(value))
            .reduce((acc, socketHashStr) => {
              const socketHash = parseInt(socketHashStr);

              const profilePlugs = profilePlugSets[socketHash] || [];
              const characterPlugs = characterPlugSets[socketHash] || [];

              return {
                ...acc,
                [socketHash]: Object.values(
                  [...profilePlugs, ...characterPlugs].reduce(
                    (acc, plug) => ({ ...acc, [plug.plugItemHash]: plug }),
                    {} as Record<number, DestinyPlugComponent>
                  )
                )
              };
            }, {} as Record<number, DestinyPlugComponent[]>)
        };
      }, {} as Record<string, Record<number, DestinyPlugComponent[]>>)
    ];
  }
};

export const resolveProfileInventoryItemInstances: ComponentDataResolver<
  DestinyProfileResponse,
  [DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
> = {
  components: [DestinyComponentType.ProfileInventories, DestinyComponentType.ItemInstances],
  resolve: (res) => {
    return [
      null,
      [res?.profileInventory?.data.items || [], res?.itemComponents?.instances?.data || {}]
    ];
  }
};
