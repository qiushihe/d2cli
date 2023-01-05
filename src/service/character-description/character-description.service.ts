import { AppModule } from "~src/module/app.module";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { BungieApiDestiny2ClassDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2GenderDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2RaceDefinition } from "~src/service/destiny2-manifest/destiny2-manifest.types";

import { CharacterDescription } from "./character-description.types";

type CharacterDescribableAttributes = {
  raceHash: number;
  genderHash: number;
  classHash: number;
};

export class CharacterDescriptionService {
  private readonly destiny2ManifestService: Destiny2ManifestService;

  constructor() {
    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");
  }

  async getDescription(
    character: CharacterDescribableAttributes
  ): Promise<[Error, null] | [null, CharacterDescription]> {
    const [genderDefinitionErr, genderDefinition] =
      await this.destiny2ManifestService.getManifestComponent<BungieApiDestiny2GenderDefinition>(
        BungieApiDestiny2ManifestLanguage.English,
        BungieApiDestiny2ManifestComponent.GenderDefinition
      );
    if (genderDefinitionErr) {
      return [genderDefinitionErr, null];
    }

    const [raceDefinitionErr, raceDefinition] =
      await this.destiny2ManifestService.getManifestComponent<BungieApiDestiny2RaceDefinition>(
        BungieApiDestiny2ManifestLanguage.English,
        BungieApiDestiny2ManifestComponent.RaceDefinition
      );
    if (raceDefinitionErr) {
      return [raceDefinitionErr, null];
    }

    const [classDefinitionErr, classDefinition] =
      await this.destiny2ManifestService.getManifestComponent<BungieApiDestiny2ClassDefinition>(
        BungieApiDestiny2ManifestLanguage.English,
        BungieApiDestiny2ManifestComponent.ClassDefinition
      );
    if (classDefinitionErr) {
      return [classDefinitionErr, null];
    }

    return [
      null,
      {
        gender: genderDefinition[character.genderHash].displayProperties.name,
        race: raceDefinition[character.raceHash].displayProperties.name,
        class: classDefinition[character.classHash].displayProperties.name
      }
    ];
  }
}
