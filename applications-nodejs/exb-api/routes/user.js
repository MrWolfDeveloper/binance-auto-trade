const Express = require('express');
const Router = Express.Router();

const UserData = require(`${__dirname}/../classes/user-data/user-data.js`).UserData;
const Validate = require(`${__dirname}/../classes/validate/validate.js`).Validate;

// Post method for first time add user
Router.post('/user', async (Request, Response) => {
	try {
		var { Username, Email, PhoneNumber, ExchangesData, SubscriptionPlanID, TXID } = Request.body;

		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } },
			{ VariableKey: 'Email', VariableValue: Email, Regex: { Name: 'Email' } }
			// { VariableKey: 'PhoneNumber', VariableValue: PhoneNumber, Regex: { Name: 'PhoneNumber' } }
		]);

		// Invalid data format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		// Check username duplicated
		if (!await UserData.CheckDuplicate({ Username: Username })) return Response.status(422).json({ code: -2001 });

		// Check phone number duplicated
		if (!await UserData.CheckDuplicate({ PhoneNumber: PhoneNumber }))
			return Response.status(422).json({ code: -2002 });

		// Check email duplicated
		if (!await UserData.CheckDuplicate({ Email: Email })) return Response.status(422).json({ code: -2003 });

		// Invalid subscription plan ID
		// if (typeof SPData[SubscriptionPlanID] === 'undefined')
		//     return Response.status(422).json({
		//         code: -2014,
		//         fields: [ 'SubscriptionPlanID' ]
		//     });

		var InsertData = {};
		InsertData.Username = Username;
		InsertData.Email = Email;
		InsertData.PhoneNumber = PhoneNumber;
		InsertData.UseFreePlan = false;
		InsertData.Signals = [];
		InsertData.WalletBalanceHistory = [];
		// InsertData.ExchangesData = ExchangesData;

		// InsertData.SubscriptionData = {
		//     TXID: TXID,
		//     PlanID: SubscriptionPlanID,
		//     PlanStartDate: StartPlanDate,
		//     PlanEndDate: StartPlanDate.setDate(StartPlanDate.getDate() + SPData[SubscriptionPlanID])
		// };

		if (!UserData.AddNewUser(InsertData)) return Response.status(500).json({ code: -500 });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.log(ReturnError, 'POST /user');

		return Response.status(500).json({ code: -500 });
	}
});

Router.get('/user/account-status/:Username', async (Request, Response) => {
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

		const UserInfo = await UserData.GetUserInfo(Username);

		if (!UserInfo.length) return Response.status(200).json({ code: 200, AccountStatus: 'none' });

		return Response.status(200).json({
			code: 200,
			AccountStatus: UserInfo[0].AccountStatus
		});
	} catch (ReturnError) {
		console.log(ReturnError, 'GET /user/:Username');

		return Response.status(500).json({ code: -500 });
	}
});

Router.put('/account-status', async (Request, Response) => {
	try {
		const { Username, NewStatus } = Request.body;

		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } }
		]);

		// Invalid username format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		// Validate status
		if ([ 'unpaid', 'free-plan', 'monetary-plan', 'expired', 'banned-account' ].indexOf(NewStatus) === -1)
			return Response.status(422).json({
				code: -2014,
				fields: [ 'NewStatus' ]
			});

		if (!await UserData.ChangeAccountStatus(Username, NewStatus)) return Response.status(500).json({ code: -500 });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.log(ReturnError, 'PUT /account-status');

		return Response.status(500).json({ code: -500 });
	}
});

// 12 October Update
Router.put('/user/balances', async (Request, Response) => {
	try {
		const { Username, SmartStoplossStatus } = Request.body;

		if (!await UserData.ChangeUserSmartStoplossStatus(Username, SmartStoplossStatus))
			return Response.status(500).json({ code: -500 });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.error(ReturnError, '/system/trade-ceiling');

		return Response.status(500).json({ code: -500 });
	}
});

Router.put('/trade-ceiling', async (Request, Response) => {
	try {
		const { Username, NewCeiling } = Request.body;

		const UpdateTradeCeiling = await UserData.ChangeUserTradeCeiling(Username, NewCeiling);

		if (UpdateTradeCeiling < 0) return Response.status(422).json({ code: UpdateTradeCeiling });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.error(ReturnError, '/system/trade-ceiling');

		return Response.status(500).json({ code: -500 });
	}
});

Router.put('/smart-stoploss', async (Request, Response) => {
	try {
		const { Username, SmartStoplossStatus } = Request.body;

		if (!await UserData.ChangeUserSmartStoplossStatus(Username, SmartStoplossStatus))
			return Response.status(500).json({ code: -500 });

		return Response.status(200).json({ code: 200 });
	} catch (ReturnError) {
		console.error(ReturnError, '/system/trade-ceiling');

		return Response.status(500).json({ code: -500 });
	}
});

Router.get('/user-balances/:Username', async (Request, Response) => {
	try {
		const { Username } = Request.params;

		const UserBalances = await UserData.GetUserBalances(Username);

		return Response.status(200).json({ code: 200, balances: UserBalances });
	} catch (ReturnError) {
		console.error(ReturnError, '/system/trade-ceiling');

		return Response.status(500).json({ code: -500 });
	}
});

Router.get('/user/sum-user-balances/:Username', async (Request, Response) => {
	try {
		const { Username } = Request.params;

		const UserBalances = await UserData.UpdateUserBalances(Username);

		// return Response.status(200).json({ code: 200, balances: UserBalances });
	} catch (ReturnError) {
		console.error(ReturnError, '/system/trade-ceiling');

		return Response.status(500).json({ code: -500 });
	}
});

module.exports = Router;
