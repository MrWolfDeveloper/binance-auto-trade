const DatabaseQuery = require(`${__dirname}/classes/database/database-query.js`).DatabaseQuery;

(async () => {
    try {
        // await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
        await DatabaseQuery.DatabaseConnect(
            'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
        );

        console.log('Database Connected!');
    } catch (DatabaseError) {
        throw new Error(DatabaseError);
    }
})().then(async () => {
    console.log(
        await DatabaseQuery.AsyncMakeDatabaseQuery({
            DBQueryMethod: 'Update',
            MethodData: {
                ModelName: 'exb-users',
                MongooseUMO: { multi: false },
                NewData: {
                    $set: {
                        'Signals.$.Quantity': 0,
                        'Signals.$.PositionStatus': `forcestop`
                    }
                },
                Which: {
                    Username: 'arabert',
                    'Signals.SignalChatID': 'rsf-30'
                }
            }
        })
    );
});
