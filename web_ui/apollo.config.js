const path = require("path");

module.exports = {
    client: {
        service: {
            localSchemaFile: path.resolve(__dirname, "../server/src/api.graphql"),
        }
    }
}