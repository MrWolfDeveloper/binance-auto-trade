const Binance = require('node-binance-api');

var Spot = Spot || {};

Spot = {
	OrderStatus: async (Currency, OrderID, BinanceConnection) => {
		return new Promise((Resolve, Reject) => {
			BinanceConnection.orderStatus(Currency, OrderID, (Error, Response, Symbol) => {
				if (Error) Reject(Error);

				Resolve(Response);
			});
		});
	},

	CancelMarketSignal: async (Currency, Quantity, BinanceConnection) => {
		try {
			console.log(Currency, Quantity, 'Currency, Quantity');
			console.log(BinanceConnection.marketSell(Currency, Number(Quantity)));

			return true;
		} catch (ReturnError) {
			console.error(ReturnError, 'Binance CancelMarketSignal');

			return false;
		}
	},

	CancelOrder: async (Currency, OrderID, BinanceConnection) => {
		return new Promise((Resolve, Reject) => {
			BinanceConnection.cancel(Currency, OrderID, (Error, Response, Symbol) => {
				if (Error) {
					console.log(Error, 'Binance CancelOrder');
					Reject(Error);
				}

				Resolve(Response);
			});
		});
	}
};

exports.Spot = Spot;
