class Load {
    /**
     *  @params {array} ObjectFilesName
     *  @returns {DictionaryObject}
     */
    ImportObject(ObjectFilesName) {
        let ReturnFile = [];

        ObjectFilesName.map((ObjectName) => {
            ReturnFile[
                ObjectName
            ] = require(`${__dirname}/channels/${ObjectName}.js`)[
                ObjectName
            ];
        });

        return ReturnFile;
    }
}

module.exports = Load;
