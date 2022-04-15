const Binance = require('node-binance-api');

var APIValidate = APIValidate || {};

APIValidate = {
	BinanceTestAPI: (APIKey, APISecret) => {
		let APITest = new Binance().options({ APIKEY: APIKey, APISECRET: APISecret });

		return new Promise((Resolve, Reject) => {
			APITest.balance((Error, Balances) => {
				console.log(Error, 'Error');
				console.log(Balances, 'Balances');
				if (Error) return Resolve(false);

				return Resolve(true);
			});
		});
	}
};

exports.APIValidate = APIValidate;
