import { AppModule } from "~src/module/app.module";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { Destiny2ManifestClassDefinition } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestGenderDefinition } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestRaceDefinition } from "~type/bungie-asset/destiny2.types";

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
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestGenderDefinition>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.GenderDefinition
      );
    if (genderDefinitionErr) {
      return [genderDefinitionErr, null];
    }

    const [raceDefinitionErr, raceDefinition] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestRaceDefinition>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.RaceDefinition
      );
    if (raceDefinitionErr) {
      return [raceDefinitionErr, null];
    }

    const [classDefinitionErr, classDefinition] =
      await this.destiny2ManifestService.getManifestComponent<Destiny2ManifestClassDefinition>(
        Destiny2ManifestLanguage.English,
        Destiny2ManifestComponent.ClassDefinition
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
