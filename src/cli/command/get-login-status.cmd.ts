import { AppModule } from "~src/module/app.module";
import { SessionService } from "~src/service/session/session.service";
import { D2QDB } from "~type/d2qdb";

export const getLoginStatus: D2QDB.CliCmdDefinition = {
  description: "Get login status of current session",
  action: async () => {
    const sessionService = AppModule.getDefaultInstance().resolve<SessionService>("SessionService");

    const [loginStatusErr, loginStatus] = await sessionService.getLoginStatus();
    if (loginStatusErr) {
      console.error(`Unable to get login status: ${loginStatusErr.message}`);
    } else {
      if (loginStatus.isLoggedIn) {
        if (loginStatus.isLoginExpired) {
          console.log("Login expired");
        } else {
          console.log("Currently logged in");
        }
      } else {
        console.log("Not logged in");
      }
    }
  }
};
