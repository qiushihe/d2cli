// For some reasons, `dotenv` will stop looking for a variable once it's defined. So in order to
// override regular variables with test specific ones, we have to source the test env file before
// sourcing the regular env file.
require("dotenv").config({ path: ".env.test" });
require("dotenv").config({ path: ".env" });
