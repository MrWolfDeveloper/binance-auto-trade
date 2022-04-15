const CronJob = require('cron').CronJob;

const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;

class ChartListener {
	CandleCloses = {
		'1w': {},
		'1d': {},
		'4h': {},
		'1h': {},
		'1m': {}
	};

	CronTimes = {
		'1w': '0 0 * * MON',
		'1d': '0 0 * * *',
		'4h': '0 0-23/4 * * *',
		'1h': '0 0-23/1 * * *',
		'1m': '0/1 * * * *'
	};

	PendingStopLoss = {};

	get LastCandleCloses() {
		return this.CandleCloses;
	}

	async AddPendingStopLossFromDatabase() {
		try {
			const Signals = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys: 'ChatID Currency StopLoss',
					SelectOptions: {},
					Where: {
						'StopLoss.Type': 'manual',
						PositionStatus: { $nin: [ 'take_profit', 'stoploss' ] }
					}
				}
			});

			if (Signals[1].length) {
				Signals[1].map(async (Signal) => {
					Signal.Currency = Signal.Currency.join('');

					await this.AddCandleStopLossListener(
						Signal.Currency,
						Signal.StopLoss.CandleInterval,
						Signal.StopLoss.CandleSide,
						Signal.StopLoss.Number,
						Signal.ChatID
					);

					// var PendingCurrency = Object.keys(this.PendingStopLoss);

					// if (PendingCurrency.indexOf(Signal.Currency) === -1) {
					// 	this.PendingStopLoss[Signal.Currency] = [];
					// }

					// this.PendingStopLoss[Signal.Currency].push({
					// 	ChatID: Signal.ChatID,
					// 	CandleSide: Signal.StopLoss.CandleSide,
					// 	StopLoss: Signal.StopLoss.Number
					// });
				});
			}
		} catch (ReturnError) {
			console.log(ReturnError, 'AddPendingStopLossFromDatabase');
		}
	}

	async AddCandleStopLossListener(Currency, Interval, CandleSide, StopLoss, ChatID) {
		//     Currency,
		//     Interval,
		//     CandleSide,
		//     StopLoss,
		//     ChatID,
		//     'Currency, Interval, CandleSide, StopLoss, ChatID'
		// );
		// Insert to the database
		try {
			// const InsertStatus = await DatabaseQuery.AsyncMakeDatabaseQuery({
			// 	DBQueryMethod: 'InsertMany',
			// 	MethodData: {
			// 		ModelName: 'exb-candle-stoploss',
			// 		InsertData: {
			// 			ChatID: ChatID,
			// 			Currency: Currency,
			// 			CandleInterval: Interval,
			// 			CandleSide: CandleSide,
			// 			StopLoss: StopLoss,
			// 			Close: false
			// 		}
			// 	}
			// });

			// if (InsertStatus[0]) {
			// Define undefined currency
			if (typeof this.PendingStopLoss[Currency] === 'undefined') this.PendingStopLoss[Currency] = {};

			// Define undefined interval
			if (typeof this.PendingStopLoss[Currency][Interval] === 'undefined')
				this.PendingStopLoss[Currency][Interval] = [];

			// Add to pending stoploss
			this.PendingStopLoss[Currency][Interval].push({
				ChatID: ChatID,
				CandleSide: CandleSide,
				StopLoss: StopLoss
			});

			if (typeof Currency === 'object') Currency = Currency[0];

			this.AddCandleListener(Currency, Interval);
			// }
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	}

	AddCronJobs(Time, Interval, Currency) {
		var Job = new CronJob({
			cronTime: Time,
			onTick: () => {
				this.CronCallback(Currency, Interval);
			},
			start: true,
			utcOffset: 0
		});

		Job.start();
	}

	AddCandleListener(Currency, Interval) {
		console.log(Currency, 'Currency AddCandleListener');
		try {
			global.BinanceSpot.BinanceConnection.websockets.candlesticks([ Currency ], Interval, (candlesticks) => {
				let { e: eventType, E: eventTime, s: symbol, k: ticks } = candlesticks;
				let {
					o: open,
					h: high,
					l: low,
					c: close,
					v: volume,
					n: trades,
					i: interval,
					x: isFinal,
					q: quoteVolume,
					V: buyVolume,
					Q: quoteBuyVolume
				} = ticks;

				// let Tick = global.BinanceSpot.BinanceConnection.last(Chart);
				const Close = close;

				// let NewInterval = '';

				// switch (Interval) {
				// 	case '1m':
				// 		NewInterval = 'OneMinute';
				// 		break;
				// 	case '1h':
				// 		NewInterval = 'OneHour';
				// 		break;
				// 	case '4h':
				// 		NewInterval = 'FourHour';
				// 		break;
				// 	case '1d':
				// 		NewInterval = 'Daily';
				// 		break;
				// 	case '1w':
				// 		NewInterval = 'Weekly';
				// 		break;
				// 	default:

				// }

				if (typeof this.CandleCloses[Interval][Currency] === 'undefined') {
					this.CandleCloses[Interval][Currency] = '';

					// Add cron job
					this.AddCronJobs(this.CronTimes[Interval], Interval, Currency);
				}

				this.CandleCloses[Interval][Currency] = Close;
			});
		} catch (returnError) {
			console.error(returnError, 'AddCandleListener Error');
		}
	}

	RemoveChartListener(Currency, Interval, SLIndex) {
		this.PendingStopLoss[Currency][Interval].splice(SLIndex, 1);
	}

	async CronCallback(Currency, Interval) {
		console.log(this.PendingStopLoss.YGGUSDT['1m'], 'this.PendingStopLoss');
		try {
			this.PendingStopLoss[Currency][Interval].map((StopLossItem, StopLossIndex) => {
				if (StopLossItem.CandleSide === 'below') {
					if (parseFloat(this.CandleCloses[Interval][Currency]) <= parseFloat(StopLossItem.StopLoss)) {
						console.log(
							parseFloat(this.CandleCloses[Interval][Currency]),
							parseFloat(StopLossItem.StopLoss),
							'parseFloat(this.CandleCloses[Interval][Currency]) <= parseFloat(StopLossItem.StopLoss)'
						);
						global.BinanceSpot.CandleStopLossSignal(StopLossItem.ChatID);

						// Remove from monitor list
						this.RemoveChartListener(Currency, Interval, StopLossIndex);
					}
				} else if (StopLossItem.CandleSide === 'above') {
					if (parseFloat(this.CandleCloses[Interval][Currency]) >= parseFloat(StopLossItem.StopLoss)) {
						global.BinanceSpot.CandleStopLossSignal(StopLossItem.ChatID);

						// Remove from monitor list
						this.RemoveChartListener(Currency, Interval, StopLossIndex);
					}
				}
			});
		} catch (ReturnError) {}
	}
}

module.exports = ChartListener;
