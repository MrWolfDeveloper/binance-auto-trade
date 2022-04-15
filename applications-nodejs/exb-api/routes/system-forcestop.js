const Express = require('express');
const Router = Express.Router();

const Request = require('request');

const DatabaseQuery = require(`${__dirname}/../classes/database/database-query.js`).DatabaseQuery;
const Futures = require(`${__dirname}/../classes/binance/futures.js`).Futures;
const Spot = require(`${__dirname}/../classes/binance/spot.js`).Spot;

const User = require(`${__dirname}/../classes/system/user/user.js`).User;
const ForceStop = require(`${__dirname}/../classes/system/signal/force-stop.js`).ForceStop;

Router.get('/openpositions', async (Request, Response) => {
	try {
		var AllOpenOrderID = await DatabaseQuery.AsyncMakeDatabaseQuery({
			DBQueryMethod: 'Select',
			MethodData: {
				ModelName: 'exb-signals',
				SelectKeys:
					'ExchangeType ChatID PositionOrderID Currency EnterPrice Targets OpenTargets Quantity ForceStop',
				SelectOptions: {},
				Where: {}
			}
		});

		var ReturnData = AllOpenOrderID[1].map((OpenOrder) => {
			return {
				ExchangeType: OpenOrder.ExchangeType,
				ChatID: OpenOrder.ChatID,
				PositionOrderID: OpenOrder.PositionOrderID,
				Currency: OpenOrder.Currency,
				EnterPrice: OpenOrder.EnterPrice,
				Targets: OpenOrder.Targets,
				OpenTargets: OpenOrder.OpenTargets,
				Quantity: OpenOrder.Quantity,
				ForceStop: `<button style="background-color: #DF5E5E; border-color: #DF5E5E;" onclick="ForceStop('${OpenOrder.ChatID}')" id="${OpenOrder.ChatID}" class="button-primary">Force stop</button>`
			};
		});

		return Response.json(ReturnData);
	} catch (ReturnError) {
		console.error(ReturnError, '/openpositions');
	}
});

Router.post('/system/forcestop', async (Request, Response) => {
	try {
		const UsersData = await User.GetUserByChatID(Request.body.ChatID);
		await ForceStop.ForceStopSignal(UsersData, true);

		return Response.json({ Status: true });
	} catch (ReturnError) {
		console.error(ReturnError, '/forcestop');

		return Response.json({ Status: false });
	}
});

Router.post('/system/forcestop-user', async (Request, Response) => {
	try {
		var Username = Request.body.Username;

		const UsersData = await User.GetUserByChatID(Request.body.ChatID);

		var UsersNewData = UsersData.filter((UserData) => {
			return UserData.Username === Username;
		});

		await ForceStop.ForceStopSignal(UsersNewData, false);

		return Response.json({ Status: true });
	} catch (ReturnError) {
		console.error(ReturnError, '/forcestop');

		return Response.json({ Status: false });
	}
});

Router.post('/external/dce215a2630deaf69c233ee9fc883fb0cb9aa143', async (Request, Response) => {
	try {
		const UsersData = await User.GetUserByChatID(Request.body.ChatID);
		await ForceStop.ForceStopSignal(UsersData, true);

		return Response.json({ Status: true });
	} catch (ReturnError) {
		console.error(ReturnError, '/forcestop');

		return Response.json({ Status: false });
	}
});

module.exports = Router;
