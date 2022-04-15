const FS = require('fs');

var LoadChannelData = LoadChannelData || {};

LoadChannelData = {
    /** Channel directory name */
    CHANNEL_DATA_DIR: 'storage/channel-data',

    /**
     * Return channels saved messages file path.
     * @param {array} FilesName without file suffix and When the array is entered is empty, All routes are returned.
     * @returns {array}
     */
    ChannelsPath: (FilesName) => {
        if (typeof FilesName != 'object') throw new Error('Only the array accepts'); 
        
        try {
            var ChannelDataFilesPath = FS.readdirSync(`${__dirname}/../../../../${LoadChannelData.CHANNEL_DATA_DIR}`).map(File => {
                if (File != '.DS_Store') {
                    // When the array is entered is empty, All routes are returned.
                    if (!FilesName.length) {
                        return `${__dirname}/../../../../${LoadChannelData.CHANNEL_DATA_DIR}/${File}`;
                    } else {
                        if (FilesName.indexOf(`${File}`.replace('.json', '')) != -1) return `${__dirname}/../../../../${LoadChannelData.CHANNEL_DATA_DIR}/${File}`;
                    }
                }
            });

            return ChannelDataFilesPath.filter(function (Element) {
                return Element != null;
            });
        } catch (ReturnError) {
            throw new Error(ReturnError);
        }
    },

    /**
     * Return channels file's content.
     * @param {array} FilesPath 
     * @returns {array}
     */
    LoadChannelsDataFile: (FilesPath) => {
        if (typeof FilesPath != 'object') throw new Error('Only the array accepts');

        try {
            var FilesContent = FilesPath.map(FilePath => {
                return { ChannelPath: FilesPath, Data: JSON.parse(FS.readFileSync(FilePath, { encoding: 'utf8' })) };
            });
            
            return FilesContent;
        } catch (ReturnError) {
            throw new Error(ReturnError);
        }
    }
};

exports.LoadChannelData = LoadChannelData;