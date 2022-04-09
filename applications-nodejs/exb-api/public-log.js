const BinanceAPI = require('node-binance-api');

const DataBaseQuery = require(`${__dirname}/classes/database/database-query.js`).DatabaseQuery;
const SignalSchema = require('./database-schema/exb-signals');

var SpotSymbolMonitor = [];
var FuturesSymbolMonitor = [];

var SignalFuturesMonitor = {};
var SignalSpotMonitor = {};

var Binance = new BinanceAPI().options({
	APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
	APISECRET: 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM',
	verbose: true,
	reconnect: true
});

function WatchSignals() {
	SignalSchema.watch().on('change', async (Data) => {
		if (Data.operationType === 'insert') {
			FreeAllVar();

			await LoadAllSignals();

			FuturesConnectWebSocket();
			SpotConnectWebSocket();
		}
	});
}

function FreeAllVar() {
	SpotSymbolMonitor = [];
	FuturesSymbolMonitor = [];

	SignalFuturesMonitor = {};
	SignalSpotMonitor = {};
}

async function UpdateDatabase(SignalFilterID, Exchange) {
	var SignalFIDArray = SignalFilterID.split(';');

	var DBSignal = await DataBaseQuery.AsyncMakeDatabaseQuery({
		DBQueryMethod: 'Select',
		MethodData: {
			ModelName: 'exb-signals',
			SelectKeys: 'ChatID ExchangeType Currency OpenTargets Targets StopLoss ForceStop PositionStatus',
			SelectOptions: {},
			Where: {
				ChatID: SignalFIDArray[1]
			}
		}
	});

	var Targets = DBSignal[1][0].Targets;

	if (typeof DBSignal[1][0].OpenTargets[0] != 'undefined') Targets.push(DBSignal[1][0].OpenTargets[0]);

	if (Exchange === 'futures') {
		if (DBSignal[1][0].ExchangeType[1] === 'long') Targets = Targets.sort((a, b) => parseFloat(a) - parseFloat(b));
		else if (DBSignal[1][0].ExchangeType[1] === 'short')
			Targets = Targets.sort((a, b) => parseFloat(b) - parseFloat(a));
	} else if (Exchange === 'spot') {
		Targets = Targets.sort((a, b) => parseFloat(a) - parseFloat(b));
	}

	var LastPositionStatus;
	if (DBSignal[1][0].PositionStatus === 'open' || DBSignal[1][0].PositionStatus === 'opening') LastPositionStatus = 0;
	else if (DBSignal[1][0].PositionStatus === 'stoploss') return;
	else {
		var TargetHitArray = DBSignal[1][0].PositionStatus.split('-');

		LastPositionStatus = parseInt(TargetHitArray[1]);
	}

	var HitIndex = Targets.indexOf(parseFloat(SignalFIDArray));

	if (HitIndex + 1 === Targets.length) {
		const UpdateDatabaseResult = await DataBaseQuery.AsyncMakeDatabaseQuery({
			DBQueryMethod: 'Update',
			MethodData: {
				ModelName: 'exb-signals',
				MongooseUMO: { multi: false },
				NewData: {
					$set: {
						PositionStatus: `take_profit`
					},
					$push: { DoneTargets: { Target: parseFloat(SignalFIDArray[0]), HitDate: new Date() } }
				},
				Which: {
					ChatID: SignalFIDArray[1]
				}
			}
		});
	} else if (HitIndex + 1 > LastPositionStatus) {
		const UpdateDatabaseResult = await DataBaseQuery.AsyncMakeDatabaseQuery({
			DBQueryMethod: 'Update',
			MethodData: {
				ModelName: 'exb-signals',
				MongooseUMO: { multi: false },
				NewData: {
					$set: {
						PositionStatus: `target-${HitIndex + 1}`
					},
					$push: { DoneTargets: { Target: parseFloat(SignalFIDArray[0]), HitDate: new Date() } }
				},
				Which: {
					ChatID: SignalFIDArray[1]
				}
			}
		});
	}
}

function FuturesConnectWebSocket() {
	FuturesSymbolMonitor.map((SymbolItem, SymbolIndex) => {
		setTimeout(() => {
			Binance.futuresMarkPriceStream(SymbolItem, (CurrentPrice) => {
				var FilteredSignal = SignalFuturesMonitor[SymbolItem].filter((SignalFilter, SignalIndex) => {
					var SignalArray = SignalFilter.split(';');

					if (SignalArray[2] === 'long') {
						if (parseFloat(CurrentPrice.markPrice) > parseFloat(SignalArray[0])) {
							SignalFuturesMonitor[SymbolItem].splice(SignalIndex, 1);
							return SignalFilter;
						}
					} else if (SignalArray[2] === 'short') {
						if (parseFloat(CurrentPrice.markPrice) < parseFloat(SignalArray[0])) {
							SignalFuturesMonitor[SymbolItem].splice(SignalIndex, 1);
							return SignalFilter;
						}
					}
				});

				if (FilteredSignal.length) {
					FilteredSignal.map(async (FS) => {
						await UpdateDatabase(FS, 'futures');
					});
				}
			});
		}, 1000 * SymbolIndex);
	});
}

function SpotConnectWebSocket() {
	Binance.websockets.candlesticks(SpotSymbolMonitor, '1m', (CandleSticks) => {
		let { k: Ticks, s: SymbolItem } = CandleSticks;
		let { c: CurrentPrice } = Ticks;

		SymbolItem = SymbolItem.toUpperCase();

		// console.log(SymbolItem, 'SymbolItem');
		// console.log(SpotSymbolMonitor, 'SpotSymbolMonitor');
		// console.log(SignalSpotMonitor[SymbolItem], 'SpotSymbolMonitor');

		var Self = this;

		var FilteredSignal = SignalSpotMonitor[SymbolItem].filter((SignalFilter, SignalIndex) => {
			var SignalArray = SignalFilter.split(';');

			if (parseFloat(CurrentPrice) > parseFloat(SignalArray[0])) {
				SignalSpotMonitor[SymbolItem].splice(SignalIndex, 1);
				return SignalFilter;
			}
		});

		if (FilteredSignal.length) {
			FilteredSignal.map(async (FS) => {
				await UpdateDatabase(FS, 'spot');
			});
		}
	});
}

async function LoadAllSignals() {
	// Get all open signals
	var AllSignals = await DataBaseQuery.AsyncMakeDatabaseQuery({
		DBQueryMethod: 'Select',
		MethodData: {
			ModelName: 'exb-signals',
			SelectKeys: 'ChatID ExchangeType Currency OpenTargets Targets StopLoss ForceStop PositionStatus',
			SelectOptions: {},
			Where: {
				PositionStatus: {
					$regex: '(?:^|W)(open|target-(.*))(?:$|W)',
					$options: 'i'
				}
			}
		}
	});

	// Manualize signals
	Promise.all(
		AllSignals[1].map((Signal) => {
			// Create symbol
			const Symbol = Signal.Currency[0] + Signal.Currency[1];

			if (Signal.ExchangeType[0] === 'binance-futures') {
				if (FuturesSymbolMonitor.indexOf(Symbol) < 0) {
					FuturesSymbolMonitor.push(Symbol);
					SignalFuturesMonitor[Symbol] = [];
				}

				var StringTargets = `${Signal.Targets.join(
					`;${Signal.ChatID};${Signal.ExchangeType[1]},`
				)}${Signal.ChatID};${Signal.ExchangeType[1]}`.split(',');
				var OpenTargets = `${Signal.OpenTargets[0]};${Signal.ChatID};${Signal.ExchangeType[1]}`;

				if (typeof Signal.OpenTargets[0] != 'undefined') StringTargets.push(OpenTargets);

				SignalFuturesMonitor[Symbol] = [ ...StringTargets, ...SignalFuturesMonitor[Symbol] ];
			} else if (Signal.ExchangeType[0] === 'binance-spot') {
				if (SpotSymbolMonitor.indexOf(Symbol) < 0) {
					SpotSymbolMonitor.push(Symbol);
					SignalSpotMonitor[Symbol] = [];
				}

				var StringTargets = `${Signal.Targets.join(`;${Signal.ChatID},`)};${Signal.ChatID}`.split(',');
				var OpenTargets = `${Signal.OpenTargets[0]};${Signal.ChatID}`;

				if (typeof Signal.OpenTargets[0] != 'undefined') StringTargets.push(OpenTargets);

				SignalSpotMonitor[Symbol] = [ ...StringTargets, ...SignalSpotMonitor[Symbol] ];
			}
		})
	);
}

/* --------------------------- Connect to database --------------------------- */
(async () => {
	try {
		// await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
		await DataBaseQuery.DatabaseConnect(
			'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
		);

		console.log('Database Connected!');
	} catch (DatabaseError) {
		throw new Error(DatabaseError);
	}
})().then(async () => {
	// setInterval(() => {
	// 	console.log(FuturesSymbolMonitor, SignalFuturesMonitor, 'futures');
	// 	console.log(SpotSymbolMonitor, SignalSpotMonitor, 'futures');
	// }, 10000);

	await LoadAllSignals();

	setTimeout(() => {
		FuturesConnectWebSocket();
	}, 450000);

	setTimeout(() => {
		SpotConnectWebSocket();
	}, 1800000);

	WatchSignals();
});
