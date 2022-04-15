const Binance = require('node-binance-api');

var Spot = Spot || {};

Spot = {
	OrderStatus: async (Currency, OrderID) => {
		var BinanceAPI = new Binance().options({
			APIKEY: 'ojg5cLOsKQtO3ZXqSjPARCUwp31qb8HDzAsgz2IvCKHQGkDVccomh7IDsxdS0bpa',
			APISECRET: '8b2T8WXObqdnPcSQY7o5vIcxGs3ktrujDqzfQfVeYqEs7d1iLzQKo4yq4t8EFi8i',
			verbose: true
		});
		return new Promise((Resolve, Reject) => {
			BinanceAPI.orderStatus(Currency, OrderID, (Error, Response, Symbol) => {
				if (Error) Reject(Error);

				Resolve(Response);
			});
		});
	},

	CancelMarketSignal: async (Currency, Quantity) => {
		console.log(typeof Currency, typeof Quantity);
		console.log(Currency, Quantity);
		try {
			var BinanceAPI = new Binance().options({
				APIKEY: 'ojg5cLOsKQtO3ZXqSjPARCUwp31qb8HDzAsgz2IvCKHQGkDVccomh7IDsxdS0bpa',
				APISECRET: '8b2T8WXObqdnPcSQY7o5vIcxGs3ktrujDqzfQfVeYqEs7d1iLzQKo4yq4t8EFi8i',
				verbose: true
			});
			await BinanceAPI.marketSell(Currency, Quantity);

			return true;
		} catch (ReturnError) {
			// console.error(ReturnError);

			return false;
		}
	},

	CancelOrder: async (Currency, OrderID) => {
		return new Promise((Resolve, Reject) => {
			var BinanceAPI = new Binance().options({
				APIKEY: 'ojg5cLOsKQtO3ZXqSjPARCUwp31qb8HDzAsgz2IvCKHQGkDVccomh7IDsxdS0bpa',
				APISECRET: '8b2T8WXObqdnPcSQY7o5vIcxGs3ktrujDqzfQfVeYqEs7d1iLzQKo4yq4t8EFi8i',
				verbose: true
			});
			BinanceAPI.cancel(Currency, OrderID, (Error, Response, Symbol) => {
				if (Error) {
					// console.log(Error);
					Reject(Error);
				}

				Resolve(Response);
			});
		});
	}
};

exports.Spot = Spot;
