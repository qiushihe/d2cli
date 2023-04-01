import { ComponentDataResolver } from "~src/service/destiny2-component-data/resolver.types";
import { DestinyComponentType } from "~type/bungie-api/destiny.types";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyCharacterProgressionComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { DestinyItemComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemSocketsComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyItemInstanceComponent } from "~type/bungie-api/destiny/entities/items.types";
import { DestinyCharacterResponse } from "~type/bungie-api/destiny/responses";

export const resolveCharacters: ComponentDataResolver<
  DestinyCharacterResponse,
  DestinyCharacterComponent
> = {
  components: [DestinyComponentType.Characters],
  resolve: (res) => {
    return res.character
      ? [null, res.character.data]
      : [new Error("Response missing character attribute"), null];
  }
};

export const resolveCharacterProgressions: ComponentDataResolver<
  DestinyCharacterResponse,
  DestinyCharacterProgressionComponent
> = {
  components: [DestinyComponentType.CharacterProgressions],
  resolve: (res) => {
    return res.progressions
      ? [null, res.progressions.data]
      : [new Error("Response missing progressions attribute"), null];
  }
};

export const resolveCharacterEquipmentItemInstances: ComponentDataResolver<
  DestinyCharacterResponse,
  [DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
> = {
  components: [DestinyComponentType.CharacterEquipment, DestinyComponentType.ItemInstances],
  resolve: (res) => {
    return [null, [res?.equipment?.data.items || [], res?.itemComponents?.instances?.data || {}]];
  }
};

export const resolveCharacterInventoryItemInstances: ComponentDataResolver<
  DestinyCharacterResponse,
  [DestinyItemComponent[], Record<string, DestinyItemInstanceComponent>]
> = {
  components: [DestinyComponentType.CharacterInventories, DestinyComponentType.ItemInstances],
  resolve: (res) => {
    return [null, [res?.inventory?.data.items || [], res?.itemComponents?.instances?.data || {}]];
  }
};

export const resolveCharacterItems: ComponentDataResolver<
  DestinyCharacterResponse,
  {
    equipped: DestinyItemComponent[];
    unequipped: DestinyItemComponent[];
    sockets: Record<string, DestinyItemSocketsComponent>;
  }
> = {
  components: [
    DestinyComponentType.CharacterInventories,
    DestinyComponentType.CharacterEquipment,
    DestinyComponentType.ItemSockets
  ],
  resolve: (res) => {
    return [
      null,
      {
        equipped: res?.equipment?.data?.items || [],
        unequipped: res?.inventory?.data?.items || [],
        sockets: res?.itemComponents?.sockets?.data || {}
      }
    ];
  }
};
