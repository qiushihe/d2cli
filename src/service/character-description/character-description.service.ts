import { AppModule } from "~src/module/app.module";
import { CharacterService } from "~src/service/character/character.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

import { CharacterDescription } from "./character-description.types";

type CharacterDescribableAttributes = {
  raceHash: number;
  genderHash: number;
  classHash: number;
};

export class CharacterDescriptionService {
  private readonly characterService: CharacterService;
  private readonly manifestDefinitionService: ManifestDefinitionService;

  constructor() {
    this.characterService = AppModule.getDefaultInstance().resolve(CharacterService);

    this.manifestDefinitionService =
      AppModule.getDefaultInstance().resolve(ManifestDefinitionService);
  }

  async getDescriptions(
    sessionId: string
  ): Promise<ErrorXOR<Record<string, CharacterDescription>>> {
    const characterDescriptions: Record<string, CharacterDescription> = {};

    const [charactersErr, characters] = await this.characterService.getCharacters(sessionId);
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
  ): Promise<ErrorXOR<CharacterDescription>> {
    const [genderDefinitionErr, genderDefinition] =
      await this.manifestDefinitionService.getGenderDefinition(character.genderHash);
    if (genderDefinitionErr) {
      return [genderDefinitionErr, null];
    }

    const [raceDefinitionErr, raceDefinition] =
      await this.manifestDefinitionService.getRaceDefinition(character.raceHash);
    if (raceDefinitionErr) {
      return [raceDefinitionErr, null];
    }

    const [classDefinitionErr, classDefinition] =
      await this.manifestDefinitionService.getClassDefinition(character.classHash);
    if (classDefinitionErr) {
      return [classDefinitionErr, null];
    }

    const genderName = genderDefinition?.displayProperties.name || "UNKNOWN GENDER";
    const raceName = raceDefinition?.displayProperties.name || "UNKNOWN RACE";
    const className = classDefinition?.displayProperties.name || "UNKNOWN CLASS";

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
