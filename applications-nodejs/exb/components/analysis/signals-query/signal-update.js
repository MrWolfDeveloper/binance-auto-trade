const DataBaseQuery = require('../../database/database-query').DatabaseQuery;

var SignalUpdate = SignalUpdate || {};

SignalUpdate = {
    SignalError: async (Signal, ErrorText) => {
        const UpdateDatabaseResult = await DataBaseQuery.AsyncMakeDatabaseQuery({
            DBQueryMethod: 'Update',
            MethodData: {
                ModelName: 'exb-signals',
                MongooseUMO: { multi: false },
                NewData: {
                    $set: {
                        PositionStatus: 'error_close',
                        TradeError: ErrorText.toString()
                    }
                },
                Which: {
                    ChatID: Signal.ChatID
                }
            }
        });

        return UpdateDatabaseResult[0];
    },

    SignalUpdate: async (ChatID, NewData) => {
        const UpdateDatabaseResult = await DataBaseQuery.AsyncMakeDatabaseQuery({
            DBQueryMethod: 'Update',
            MethodData: {
                ModelName: 'exb-signals',
                MongooseUMO: { multi: false },
                NewData: NewData,
                Which: {
                    ChatID: ChatID
                }
            }
        });

        return UpdateDatabaseResult[0];
    }
};

exports.SignalUpdate = SignalUpdate;
