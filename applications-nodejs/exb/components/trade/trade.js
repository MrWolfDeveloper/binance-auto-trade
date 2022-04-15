const BinanceSpot = require(`${__dirname}/exchanges/binance/spot`).BinanceSpot;
const BinanceFutures = require(`${__dirname}/exchanges/binance/futures`);
const SignalUpdate = require(`${__dirname}/../analysis/signals-query/signal-update`).SignalUpdate;

var EXBTrade = EXBTrade || {};

EXBTrade = {
	// Check all keys exist and reference to exchange
	ReadyForTrade: (Signals) => {
		console.log(Signals, 'Signals');

		Signals.map((Signal) => {
			if (
				Signal.ChatID &&
				Signal.ExchangeType &&
				Signal.Currency &&
				Signal.EnterPrice &&
				Signal.Targets &&
				Signal.OpenTargets &&
				Signal.Capital &&
				Signal.StopLoss &&
				Signal.ForceStop
			) {
				// Reference to exchange
				switch (Signal.ExchangeType[0]) {
					case 'binance-spot':
						// console.log('Binance Spot Trading ...');
						global.BinanceSpot.Trade(Signal);
						break;
					case 'binance-futures':
						// global.BinanceFutures.AddFromDatabase();
						global.BinanceFutures.Trade(Signal);
						break;
					default:
						// Exchange type not found
						SignalUpdate.SignalError(Signal, 'Exchange type not found');
				}
			}
		});

		// AllSignals = AllSignals.filter(function(Element) {
		// 	return Element != null;
		// });
	}
};

exports.EXBTrade = EXBTrade;
