const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;
const User = require(`${__dirname}/user.js`).User;
const Spot = new (require(`${__dirname}/../trade/exchanges/binance/spot.js`))();
const SPC = new (require(`${__dirname}/../trade/exchanges/binance/spot-position-checker.js`))();

const ProxyHandler = require(`${__dirname}/../trade/proxy.js`).ProxyHandler;

const NBM = require('node-binance-api');
// const Binance = new NBM().options({
// 	APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
// 	APISECRET: 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM'
// });

async function ClosePosition(PositionType, Currency, OrderID, BinanceC) {
	var OrderType = '';
	var Options = {};

	const OrderData = await BinanceC.futuresOrderStatus(Currency, { orderId: OrderID });
	var Quantity = parseFloat(OrderData.origQty);

	if (PositionType === 'long') {
		OrderType = 'futuresMarketSell';
		Options = {
			newOrderRespType: 'RESULT',
			positionSide: 'LONG',
			side: 'BUY'
		};
	} else if (PositionType === 'short') {
		OrderType = 'futuresMarketBuy';
		Options = {
			newOrderRespType: 'RESULT',
			positionSide: 'SHORT',
			side: 'SELL'
		};
	}

	return await BinanceC[OrderType](Currency, Quantity, Options);
}

var Binance;
(async () => {
	var ReturnProxy = await ProxyHandler.BestProxyIP();

	Binance = new NBM().options({
		APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
		APISECRET: 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM'
		// proxy: ReturnProxy
	});
	// try {
	//     await DatabaseQuery.DatabaseConnect(
	//         'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
	//     );

	// } catch (DatabaseError) {
	//     throw new Error(DatabaseError);
	// }
})().then(async () => {
	var SendYet = true;

	var Count = 0;
	while (SendYet) {
		if (Count % 40 === 0) {
			var PositionStatus = await ClosePosition('short', 'BNBUSDT', 34117202709, Binance);
		} else {
			var PositionStatus = ClosePosition('short', 'BNBUSDT', 34117202709, Binance);
		}

		Count = Count + 1;

		// if (PositionStatus.code.toString() === '-1003') {
		//     SendYet = false;

		// }
	}

	// var Currency = 'BNBUSDT';
	// var OrderID = '34116835582';

	// var PositionType = 'long';
	// var Currency = 'BNBUSDT';
	// var OrderID = '34116835476';
	// var OrderType = '';
	// var Options = {};
	// const OrderData = await Binance.futuresOrderStatus('BNBUSDT', { orderId: '34117202709' });

	// var Quantity = parseFloat(OrderData.origQty);
	// if (PositionType === 'long') {
	//     OrderType = 'futuresMarketSell';
	// Options = {
	//     newOrderRespType: 'RESULT',
	//     positionSide: 'LONG',
	//     side: 'BUY'
	// };
	// } else if (PositionType === 'short') {
	//     OrderType = 'futuresMarketBuy';
	//     Options = {
	//         newOrderRespType: 'RESULT',
	//         positionSide: 'SHORT',
	//         side: 'SELL'
	//     };
	// }

	//     await Binance.futuresMarketSell('BNBUSDT', '0.14', {
	//         newOrderRespType: 'RESULT',
	//         positionSide: 'LONG',
	//         side: 'BUY'
	//     })
	// );
	// await User.UpdateUserSignal('arabert', 'rs-616', {
	//     $set: {
	//         'Signals.$.DoneTargets': []
	//     }
	// });
	// await Spot.CandleStopLossSignal('rs-551');
	// var ListenKey = await Binance.futuresGetDataStream();

	// Binance.futuresSubscribeSingle(ListenKey.listenKey, (Data) => {
	// 	var { e: Event } = Data;
	// 	if (Event === 'ORDER_TRADE_UPDATE') {
	// 		var { s: Currency, X: OrderStatus, i: OrderID, o: OrderType, q: Quantity } = Data.o;

	// 	}
	// });

	// Binance.futuresSubscribe('ksmusdt@forceOrder, !forceOrder@arr', (Data) => {

	// 	// let { aggTradeId, firstTradeId, lastTradeId } = Data;

	// 	// var TP = 6184132518;
	// 	// var SL = 6184132575;
	// 	// if (aggTradeId === TP || firstTradeId === TP || lastTradeId === TP) {

	// 	// }
	// 	// if (aggTradeId === SL || firstTradeId === SL || lastTradeId === SL) {

	// 	// }
	// });

	// Spot.AddFakeSignal('arabert');
	// User.UpdateUserSignal('mami13p3', 'rs-481', {
	// 	$set: {
	// 		'Signals.$.PositionStatus': 'stoploss'
	// 	}
	// });
	// await SPC.OrderOCO('KSMUSDT', 0.004, 198, 195, 'rs-527', true, {}, 'arabert');
	// var Signals = await User.GetUserSignal('payam13p3', 'rs-458', 'Signals');
	// const UserSignal = await User.GetUserSignal('mami13p3', 'rs-488', 'Signals');

	// var Users = await User.GetTradeUsers('Futures', 'USDT');

	// await User.UpdateUserSignal('payam13p3', 'rs-450', {
	//     $push: {
	//         'Signals.$.DoneTargets': {
	//             OrderListID: 11111,
	//             SLOrderID: 1111,
	//             TPOrderID: 111,
	//             OrderQuantity: 0.1,
	//             Price: 111111,
	//             Hit: false,
	//             Type: 'oco_order'
	//         }
	//     }
	// });
});

// function* TestYi() {
// 	// var TestArray = [ 1, 2, 3, 4, 5 ];
// 	// yield* [ 1, 2, 3, 4, 5 ];
// 	yield* 1;
// 	yield* 2;
// 	yield* 3;
// 	yield 4;
// 	yield 5;
// 	yield 6;
// }
