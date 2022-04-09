const BinanceAPI = require('node-binance-api');

const DatabaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;

const ProxyHandler = require(`${__dirname}/proxy.js`).ProxyHandler;

const Futures = require(`${__dirname}/../../binance/futures.js`).Futures;
const Spot = require(`${__dirname}/../../binance/spot.js`).Spot;
// const DatabaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;

var ForceStop = ForceStop || {};

ForceStop = {
	SpotLastPrice: (BinanceConnection, Currency) => {
		return new Promise((Resolve) => {
			BinanceConnection.prices(Currency, (Error, Ticker) => {
				Resolve(Ticker[Currency]);
			});
		});
	},

	ForceStopSignal: async (UsersList, MainForceStop) => {
		// Update signal status in signals collection if this not user force stop
		if (MainForceStop) {
			await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-signals',
					MongooseUMO: { multi: false },
					NewData: {
						$set: {
							ForceStop: { ClosePrice: 10000, CloseDate: new Date(Date.now()) },
							PositionStatus: 'forcestop'
						}
					},
					Which: {
						ChatID: UsersList[0].Signals[0].SignalChatID
					}
				}
			});
		}

		var LastCurrencyPrice;

		if (UsersList.length) {
			var { Currency, ExchangeType } = UsersList[0].Signals[0]._doc;

			var CurrencyTextForPrice = Currency[0] + Currency[1];

			var BinanceConnectionForPrice = new BinanceAPI().options({
				APIKEY: UsersList[0].ExchangesData.Binance.APIKey,
				APISECRET: UsersList[0].ExchangesData.Binance.APISecret,
				recvWindow: 60000,
				verbose: true
			});

			if (ExchangeType[0] === 'binance-futures') {
				// Get last price of currency
				LastCurrencyPrice = await BinanceConnectionForPrice.futuresMarkPrice(CurrencyTextForPrice);
				LastCurrencyPrice = LastCurrencyPrice.markPrice;
			} else if (ExchangeType[0] === 'binance-spot') {
				// Get last price of currency
				LastCurrencyPrice = await ForceStop.SpotLastPrice(BinanceConnectionForPrice, CurrencyTextForPrice);
			}
		}

		UsersList.map(async (User, UserIndex) => {
			// setTimeout(() => {}, 500 * UserIndex);
			var ReturnProxy = await ProxyHandler.BestProxyIP();
			var BinanceConnection = new BinanceAPI().options({
				APIKEY: User.ExchangesData.Binance.APIKey,
				APISECRET: User.ExchangesData.Binance.APISecret,
				recvWindow: 60000,
				verbose: true
				// proxy: ReturnProxy
			});

			const {
				_id,
				ExchangeType,
				Currency,
				DoneTargets,
				SignalChatID,
				PositionStatus,
				Quantity,
				EntryPrice,
				PositionOrderID
			} = User.Signals[0]._doc;
			const CurrencyText = Currency[0] + Currency[1];

			// Binance futures
			if (ExchangeType[0] === 'binance-futures') {
				// Get last price of currency
				// if (!UserIndex) {
				// 	LastCurrencyPrice = await BinanceConnection.futuresMarkPrice(CurrencyText);
				// 	console.log(LastCurrencyPrice, 'LastCurrencyPrice');
				// 	LastCurrencyPrice = LastCurrencyPrice.markPrice;
				// }

				console.log(
					await Futures.ClosePosition(
						ExchangeType[1],
						CurrencyText,
						PositionOrderID,
						Quantity,
						BinanceConnection
					),
					'futures closePosition forcestop',
					User.Username
				);
				// DoneTargets.map(async (DoneTarget) => {
				// 	if (!DoneTarget.Hit) {
				// 		// Cancel all orders
				// 		await Futures.CancelOrder(CurrencyText, DoneTarget.OrderID, BinanceConnection);
				// 	}
				// });
			} else if (ExchangeType[0] === 'binance-spot') {
				// Get last price of currency
				// if (!UserIndex) LastCurrencyPrice = await ForceStop.SpotLastPrice(BinanceConnection, CurrencyText);

				DoneTargets.map(async (DoneTarget, DNIndex) => {
					if (!DoneTarget.Hit) {
						// Cancel all orders
						if (DoneTarget.Type === 'oco_order') {
							await Spot.CancelOrder(CurrencyText, DoneTarget.SLOrderID, BinanceConnection);
						} else {
							await Spot.CancelOrder(CurrencyText, DoneTarget.OrderID, BinanceConnection);
						}

						if ((DNIndex = DoneTargets.length - 1)) {
							setTimeout(async () => {
								await Spot.CancelMarketSignal(CurrencyText, Quantity, BinanceConnection);
							}, 5000);
						}
					}
				});
			}

			// Update force stop close price in public signals
			if (!UserIndex) {
				console.log('Update public signals ...');

				await DatabaseQuery.AsyncMakeDatabaseQuery({
					DBQueryMethod: 'Update',
					MethodData: {
						ModelName: 'exb-signals',
						MongooseUMO: { multi: false },
						NewData: {
							$set: {
								ForceStop: { ClosePrice: LastCurrencyPrice, CloseDate: new Date(Date.now()) },
								PositionStatus: 'forcestop'
							}
						},
						Which: {
							ChatID: UsersList[0].Signals[0].SignalChatID
						}
					}
				});
			}

			// Update user signal status
			console.log(
				await DatabaseQuery.AsyncMakeDatabaseQuery({
					DBQueryMethod: 'Update',
					MethodData: {
						ModelName: 'exb-users',
						MongooseUMO: { multi: false },
						NewData: {
							$set: {
								'Signals.$.Quantity': 0,
								'Signals.$.ForceStop': {
									ClosePrice: LastCurrencyPrice,
									CloseDate: new Date(Date.now())
								},
								'Signals.$.PositionStatus': `forcestop`
							}
						},
						Which: {
							Username: User.Username,
							'Signals.SignalChatID': SignalChatID
						}
					}
				}),
				'Force stop update'
			);
		});
	}
};

exports.ForceStop = ForceStop;
