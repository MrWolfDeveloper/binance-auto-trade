const DataBaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;
const FakeSignals = require(`${__dirname}/fake-signals`).FakeSignals;

/* --------------------------- Connect to database --------------------------- */
(async () => {
	// await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
	await DataBaseQuery.DatabaseConnect(
		'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
	);

	console.log('Database Connected!');
})().then(async () => {
	FakeSignals.AddNewSignalsToUser();
});
