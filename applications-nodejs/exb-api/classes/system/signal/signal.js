const DatabaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;

var Signal = Signal || {};

Signal = {
    GetSignals: async (Filter, SelectKeys) => {
        try {
            const Signals = await DatabaseQuery.AsyncMakeDatabaseQuery({
                DBQueryMethod: 'Select',
                MethodData: {
                    ModelName: 'exb-signals',
                    SelectKeys: SelectKeys,
                    SelectOptions: { sort: { SignalDate: -1 } },
                    Where: Filter
                }
            });

            return Signals[1];
        } catch (ReturnError) {
            throw new Error(ReturnError);
        }
    }
};

exports.Signal = Signal;
