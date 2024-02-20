# OAuth Return De-HTTPS Redirector

The OAuth "Redirect URL" for a Bungie app can not be set to use `http://` as protocol, and it has
to be `https://`. This is very annoying for handling OAuth return from a local/CLI application, as
the application would be running a HTTP server on `localhost`.

So this "De-HTTPS Redirector" HTML file is used to convert a HTTPS return URL to a non-HTTPS one.

To use this redirector, upload the HTML file to a publicly accessible place, and then set the OAuth
"Redirect URL" for a Bungie app to the URL pointing to the redirector HTML file.

For example, if the file is uploaded to S3, the "Redirect URL" would be:

```
https://my-bucket.s3.us-east-1.amazonaws.com/oauth-return-de-https-redirecter.html
```

## Port

Since the HTML file is a static file, it has hardcoded port number for the local OAuth return
handler server. The same port number is also specified in `src/cli/command/auth/login.cmd.ts`,
as part of the call to the `startOAuthReturnHandlerServer` function.

If the port number passed into the `startOAuthReturnHandlerServer` function is ever changed, the
same change must also be made to the hardcoded port number in the HTML file.
