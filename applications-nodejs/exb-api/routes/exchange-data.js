const UserData = require(`${__dirname}/../classes/user-data/user-data.js`).UserData;
const Validate = require(`${__dirname}/../classes/validate/validate.js`).Validate;
const APIValidate = require(`${__dirname}/../classes/validate/api-validate.js`).APIValidate;

const Express = require('express');
const Router = Express.Router();

Router.get('/exchanges/api-data/:Exchange/:Username', async (Request, Response) => {
	try {
		const { Username, Exchange } = Request.params;

		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } }
		]);

		// Invalid username format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		let ExchangesData = await UserData.GetUserInfo(Username, 'ExchangesData');

		var ExchangeName;
		if (Exchange === 'binance') ExchangeName = 'Binance';

		// Username not found
		if (typeof ExchangesData[0] === 'undefined') return Response.status(200).json({ code: -2005 });

		if (typeof ExchangesData[0].ExchangesData[ExchangeName] === 'undefined')
			return Response.status(200).json({ code: 200, APIKey: 'not-set', APISecret: 'not-set' });

		return Response.status(200).json({
			code: 200,
			APIKey: ExchangesData[0].ExchangesData[ExchangeName].APIKey,
			APISecret: ExchangesData[0].ExchangesData[ExchangeName].APISecret
		});
	} catch (ReturnError) {
		console.log(ReturnError, 'PUT /exchanges/add-api');

		return Response.status(500).json({ code: -500 });
	}
});

// Add exchange api key & api secret
Router.put('/exchanges/add-api', async (Request, Response) => {
	try {
		var { Username, Exchange, APIKey, APISecret } = Request.body;

		APIKey = APIKey.replace(/\s/g, '');
		APISecret = APISecret.replace(/\s/g, '');

		if ([ 'binance' ].indexOf(Exchange.toLowerCase()) === -1)
			return Response.status(422).json({ code: -2014, fields: 'Exchange' });

		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } },
			{ VariableKey: 'APIKey', VariableValue: APIKey, Regex: { Name: 'BinanceAPI' } },
			{ VariableKey: 'APISecret', VariableValue: APISecret, Regex: { Name: 'BinanceAPI' } }
		]);

		// Invalid data format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		// Check api data (binance)
		if (!await APIValidate.BinanceTestAPI(APIKey, APISecret)) return Response.status(422).json({ code: -2004 });

		// Add api data
		if (!await UserData.UpdateAPIData(Username, Exchange.toLowerCase(), APIKey, APISecret))
			return Response.status(500).json({ code: -500 });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.log(ReturnError, 'PUT /exchanges/add-api');

		return Response.status(500).json({ code: -500 });
	}
});

module.exports = Router;
