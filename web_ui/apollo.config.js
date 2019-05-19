const path = require('path');

module.exports = {
    client: {
        service: {
            name: 'tmsocial',
            localSchemaFile: path.resolve(__dirname, "../server/src/api.graphql"),
        }
    }
};
