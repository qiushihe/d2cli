import React from "react";
import { render } from "ink";

import { CommandDefinition } from "~src/cli/d2cli.types";
import { EventForm } from "~src/component/event-form";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";

type CmdOptions = SessionIdCommandOptions & { _: never };

const cmd: CommandDefinition = {
  description: "Add a calendar event",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:calendar:add");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const { clear, unmount, waitUntilExit } = render(
      <EventForm
        focus={true}
        onCancel={(values) => {
          // clear();
          unmount();
          logger.log("!!! onCancel", JSON.stringify(values));
        }}
        onError={(errors, values) => {
          logger.log("!!! onError", JSON.stringify(errors), JSON.stringify(values));
        }}
        onSubmit={(values) => {
          clear();
          unmount();
          logger.log("!!! onSubmit", JSON.stringify(values));
        }}
      />
    );

    await waitUntilExit();
    logger.log("!!! ink unmounted");
  }
};

export default cmd;
