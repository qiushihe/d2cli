import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";

import { BaseServiceOptions } from "./base.types";

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(options: BaseServiceOptions) {
    this.logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger(options.loggerNamespace);
  }
}
