import "~src/module/register";

import { AppModule } from "~src/module/app.module";

export const useModule = <T>(name: string) => {
  const getModule = () => AppModule.getDefaultInstance().resolve<T>(name);
  return { getModule };
};
