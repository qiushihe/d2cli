import React from "react";
import { render } from "ink";

import { CommandDefinition } from "~src/cli/d2cli.types";
import { EventForm, EventFormValues } from "~src/component/event-form";
import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";

import { SessionIdCommandOptions, sessionIdOption } from "../../command-option/session-id.option";

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

    let formValues: EventFormValues | null = null;
    const { clear, unmount, waitUntilExit } = render(
      <EventForm
        focus={true}
        onCancel={() => {
          clear();
          unmount();
          formValues = null;
        }}
        onSubmit={(values) => {
          clear();
          unmount();
          formValues = values;
        }}
      />
    );

    await waitUntilExit();

    if (formValues) {
      logger.debug(formValues as EventFormValues);
    }
  }
};

export default cmd;
