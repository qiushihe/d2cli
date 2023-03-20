import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
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
  private readonly destiny2CharacterService: Destiny2CharacterService;

  constructor() {
    this.destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    this.destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");
  }

  async getDescriptions(
    sessionId: string
  ): Promise<[Error, null] | [null, Record<string, CharacterDescription>]> {
    const characterDescriptions: Record<string, CharacterDescription> = {};

    const [charactersErr, characters] = await this.destiny2CharacterService.getCharacters(
      sessionId
    );
    if (charactersErr) {
      return [charactersErr, null];
    }

    for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
      const character = characters[characterIndex];
      const [characterDescriptionErr, characterDescription] = await this.getDescription(character);
      if (characterDescriptionErr) {
        return [characterDescriptionErr, null];
      }

      characterDescriptions[character.characterId] = characterDescription;
    }

    return [null, characterDescriptions];
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

    const genderName = genderDefinition[character.genderHash].displayProperties.name;
    const raceName = raceDefinition[character.raceHash].displayProperties.name;
    const className = classDefinition[character.classHash].displayProperties.name;

    return [
      null,
      {
        gender: genderName,
        race: raceName,
        class: className,
        asString: `${genderName} ${raceName} ${className}`
      }
    ];
  }
}
