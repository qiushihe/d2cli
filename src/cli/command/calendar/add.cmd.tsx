import React from "react";
import { render } from "ink";

import { CommandDefinition } from "~src/cli/d2cli.types";
import { Form } from "~src/component/form";
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
      <Form
        focus={true}
        fields={[
          { name: "title", type: "text", label: "Title", placeholder: "Event title ..." },
          { name: "date", type: "date", label: "Date" },
          {
            name: "repeat",
            type: "select",
            label: "Repeat",
            options: [
              { label: "No repeat", value: "no-repeat" },
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
              { label: "Annual", value: "annual" }
            ]
          },
          { name: "endDate", type: "date", label: "Repeat ends" },
          { name: "notes", type: "textarea", label: "Notes", placeholder: "Enter some notes ..." }
        ]}
        onCancel={() => {
          // clear();
          unmount();
          logger.log("!!! onCancel", clear);
        }}
        onSubmit={(value) => {
          // clear();
          unmount();
          logger.log("!!! onSubmit", clear, JSON.stringify(value));
        }}
      />
    );

    await waitUntilExit();
    logger.log("!!! ink unmounted");
  }
};

export default cmd;
