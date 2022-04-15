const DataBaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;

var MainSignalLog = MainSignalLog || {};

MainSignalLog = {
	// Monitor variables
	FuturesMonitorList: [],
	SportMonitorList: [],

	GetAllSignals: async () => {
		try {
			var AllSignals = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys:
						'ExchangeType Currency EnterPrice OpenTargets Targets SignalDate ChatID Capital StopLoss ForceStop PositionStatus',
					SelectOptions: {},
					Where: {
						PositionStatus: { $regex: '(?:^|W)(open|target-(.*))(?:$|W)', $options: 'i' }
					}
				}
			});

			return AllSignals[1];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	Futures: {
		MonitorAllSignals: async () => {
			try {
				const AllSignals = await MainSignalLog.GetAllSignals();

				// AllSignals.
			} catch (ReturnError) {
				throw new Error(ReturnError);
			}
		},

		PriceStream: () => {
			global.BinanceFutures.BinanceConnection.futuresMarkPriceStream(MainSignalLog.Futures.CheckTarget);
		},

		CheckTarget: (Prices) => {
			// console.log(Prices);
		}
	},
	Spot: {}
};

exports.MainSignalLog = MainSignalLog;
