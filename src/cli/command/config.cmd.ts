import { CommandDefinition } from "~src/cli/d2cli.types";
import { ConfigService } from "~src/service/config/config.service";
import { AppConfigName } from "~src/service/config/config.types";

const configNames = Object.values(AppConfigName)
  .map((name) => `"${name}"`)
  .join(", ");

const getAppConfigName = (value: string): [Error, null] | [null, AppConfigName] => {
  const key = Object.keys(AppConfigName).find((key) => (AppConfigName as any)[key] == value);
  if (!key) {
    return [new Error(`"${value}" is not one of ${configNames}`), null];
  }
  return [null, (AppConfigName as any)[key] as AppConfigName];
};

const cmd: CommandDefinition = {
  description: "Configuration of Destiny 2 CLI",
  arguments: [
    {
      name: "action",
      description: 'Operation on configuration item; Either "get" or "set"',
      isRequired: true
    },
    {
      name: "name",
      description: `Configuration item name; Possible values are: ${configNames}`,
      isRequired: true
    },
    {
      name: "value",
      description: 'Configuration item value; Only required when "action" is "set"',
      isRequired: false
    }
  ],
  action: async (args, _, { app, logger }) => {
    const config = app.resolve(ConfigService);

    const [action, configName, configValue] = args;

    if (action !== "get" && action !== "set") {
      return logger.loggedError(`Invalid action: ${action}`);
    }

    const [getAppConfigNameErr, appConfigName] = getAppConfigName(configName);
    if (getAppConfigNameErr) {
      return logger.loggedError(`Invalid configuration item: ${getAppConfigNameErr.message}`);
    }

    if (action === "get") {
      const [getConfigValueErr, configValue] = config.getAppConfig(appConfigName);
      if (getConfigValueErr) {
        return logger.loggedError(`Unable to get config value: ${getConfigValueErr.message}`);
      }

      logger.log(`${configName}: ${JSON.stringify(configValue)}`);
    } else {
      if (appConfigName === AppConfigName.LogLevel) {
        if (!["error", "warning", "info", "debug"].includes(configValue)) {
          return logger.loggedError(`Invalid log level: ${configValue}`);
        }
      }

      let newConfigValue: string | null = configValue;
      if (newConfigValue === "null") {
        newConfigValue = null;
      }

      const setConfigValueErr = config.setAppConfig(appConfigName, newConfigValue);
      if (setConfigValueErr) {
        return logger.loggedError(`Unable to set config value: ${setConfigValueErr.message}`);
      }

      logger.log(`${configName}: ${JSON.stringify(newConfigValue)}`);
    }
  }
};

export default cmd;
