import {
  DestinyDamageTypeDefinition,
  DestinyRaceDefinition
} from "~type/bungie-api/destiny/definitions.types";
import { DestinyPlaceDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyDestinationDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyGenderDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyClassDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyInventoryBucketDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyInventoryItemDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyStatDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyProgressionDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyVendorDefinition } from "~type/bungie-api/destiny/definitions.types";
import { DestinyVendorGroupDefinition } from "~type/bungie-api/destiny/definitions.types";

export enum Destiny2ManifestLanguage {
  English = "en",
  French = "fr"
}

export enum Destiny2ManifestComponent {
  RaceDefinition = "DestinyRaceDefinition",
  GenderDefinition = "DestinyGenderDefinition",
  ClassDefinition = "DestinyClassDefinition",
  InventoryBucketDefinition = "DestinyInventoryBucketDefinition",
  InventoryItemDefinition = "DestinyInventoryItemDefinition",
  StatDefinition = "DestinyStatDefinition",
  ProgressionDefinition = "DestinyProgressionDefinition",
  VendorDefinition = "DestinyVendorDefinition",
  VendorGroupDefinition = "DestinyVendorGroupDefinition",
  DestinationDefinition = "DestinyDestinationDefinition",
  PlaceDefinition = "DestinyPlaceDefinition",
  SocketCategoryDefinition = "DestinySocketCategoryDefinition",
  DamageTypeDefinition = "DestinyDamageTypeDefinition"
}

export type Destiny2ManifestRaceDefinition = Record<number, DestinyRaceDefinition>;

export type Destiny2ManifestGenderDefinition = Record<number, DestinyGenderDefinition>;

export type Destiny2ManifestClassDefinition = Record<number, DestinyClassDefinition>;

export type Destiny2ManifestInventoryBucketDefinitions = Record<
  number,
  DestinyInventoryBucketDefinition
>;

export type Destiny2ManifestInventoryItemDefinitions = Record<
  number,
  DestinyInventoryItemDefinition
>;

export type Destiny2ManifestStatDefinitions = Record<number, DestinyStatDefinition>;

export type Destiny2ManifestProgressionDefinitions = Record<number, DestinyProgressionDefinition>;

export type Destiny2ManifestVendorDefinitions = Record<number, DestinyVendorDefinition>;

export type Destiny2ManifestVendorGroupDefinitions = Record<number, DestinyVendorGroupDefinition>;

export type Destiny2ManifestDestinationDefinitions = Record<number, DestinyDestinationDefinition>;

export type Destiny2ManifestPlaceDefinitions = Record<number, DestinyPlaceDefinition>;

export type Destiny2ManifestDamageTypeDefinitions = Record<number, DestinyDamageTypeDefinition>;
