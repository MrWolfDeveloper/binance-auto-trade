const UserData = require(`${__dirname}/../classes/user-data/user-data.js`).UserData;
const Validate = require(`${__dirname}/../classes/validate/validate.js`).Validate;
const Plan = require(`${__dirname}/../classes/user-data/plan.js`).Plan;
const PaymentValidate = new (require(`${__dirname}/../classes/validate/payment-validate.js`))();

const Express = require('express');
const Router = Express.Router();

Router.post('/plan/add-plan', async (Request, Response) => {
	try {
		var { Username, SubscriptionPlanID, TXID } = Request.body;

		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } }
		]);

		// Invalid username format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		// Check api data exist
		const APIData = await UserData.GetUserInfo(Username, 'ExchangesData');

		if (
			typeof APIData[0] === 'undefined' ||
			typeof APIData[0].ExchangesData.Binance.APIKey === 'undefined' ||
			typeof APIData[0].ExchangesData.Binance.APISecret === 'undefined'
		)
			return Response.status(200).json({ code: -2006 });

		if (SubscriptionPlanID.toLowerCase() != 'free') {
			// Check TXID
			if (!await PaymentValidate.CoinbaseCommerce(TXID))
				return Response.status(422).json({ code: -2014, fields: [ 'TXID' ] });

			// The subscription is in use?
			// if (await UserData.SubscriptionInUse(Username)) return Response.status(200).json({ code: -2007 });
		} else {
			// Have previously used a free account?
			if (await UserData.UsedFreeSubscription(Username)) return Response.status(200).json({ code: -2008 });

			TXID = 'free';

			let FreePlanUsed = await UserData.SetFreePlanUsed(Username);
			// Set free plan used
			if (!FreePlanUsed) return Response.status(500).json({ code: -500 });
		}

		// Wrong subscription plan id
		if (!Plan.ValidatePlanID(SubscriptionPlanID.toLowerCase())) return Response.status(200).json({ code: -2009 });

		let AddPlanStatus = await Plan.AddPlanToUser(
			Username,
			TXID,
			SubscriptionPlanID.toLowerCase(),
			APIData[0].ExchangesData.Binance.APIKey,
			APIData[0].ExchangesData.Binance.APISecret
		);

		if (!AddPlanStatus) return Response.status(500).json({ code: -500 });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.log(ReturnError, 'POST /plan/add-plan');

		return Response.status(500).json({ code: -500 });
	}
});

Router.get('/plan/get-plan/:Username', async (Request, Response) => {
	try {
		const { Username } = Request.params;

		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } }
		]);

		// Invalid username format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		const UserInfo = await UserData.GetUserInfo(Username, 'SubscriptionData TradeSpan ExchangesData');

		if (typeof UserInfo[0].SubscriptionData.PlanID === 'undefined')
			return Response.status(200).json({ code: 200, planData: {} });

		const ReturnData = {
			SubscriptionData: {
				PlanID: UserInfo[0].SubscriptionData.PlanID,
				PlanStartDate: UserInfo[0].SubscriptionData.PlanStartDate,
				PlanEndDate: UserInfo[0].SubscriptionData.PlanEndDate
			},
			TradeSpan: {
				SpotUSDT: UserInfo[0].TradeSpan.Binance.SpotUSDT,
				SpotBTC: UserInfo[0].TradeSpan.Binance.SpotBTC,
				Futures: UserInfo[0].TradeSpan.Binance.Futures
			},
			ExchangesData: {
				VeryHighRiskSignal: UserInfo[0].ExchangesData.Binance.VeryHighRiskSignal,
				SpotCeilingAmount: {
					USDT: UserInfo[0].ExchangesData.Binance.SpotCeilingAmount.USDT,
					BTC: UserInfo[0].ExchangesData.Binance.SpotCeilingAmount.BTC
				},
				FuturesCeilingAmount: {
					USDT: UserInfo[0].ExchangesData.Binance.FuturesCeilingAmount.USDT
				}
			}
		};

		return Response.status(200).json({ code: 200, planData: ReturnData });
	} catch (ReturnError) {
		console.log(ReturnError, 'GET /plan/get-plan/:Username');

		return Response.status(500).json({ code: -500 });
	}
});

module.exports = Router;
