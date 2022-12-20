export class ConfigService {
  private static defaultInstance: ConfigService;

  static getDefaultInstance() {
    if (!ConfigService.defaultInstance) {
      ConfigService.defaultInstance = new ConfigService();
    }
    return ConfigService.defaultInstance;
  }

  getBungieApiRoot(): string {
    return "https://www.bungie.net/Platform";
  }

  // /common/destiny2_content/json/es/DestinyCollectibleDefinition-ed55fd73-3627-4784-9026-96aae1a7b82f.json
  getBungieAssetRoot(): string {
    return "https://www.bungie.net";
  }

  getBungieApiKey(): string {
    return process.env.BUNGIE_API_KEY || "";
  }

  getBungieOauthRoot(): string {
    return process.env.BUNGIE_OAUTH_ROOT || "";
  }

  getBungieOauthClientId(): string {
    return process.env.BUNGIE_OAUTH_CLIENT_ID || "";
  }
}
