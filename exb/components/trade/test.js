// const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;

// const Spot = new (require(`${__dirname}/exchanges/binance/spot-position-checker.js`))();

// (async () => {
//     try {
//         await DatabaseQuery.DatabaseConnect(
//             'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
//         );

//     } catch (DatabaseError) {
//         throw new Error(DatabaseError);
//     }
// })().then(async () => {
//     await Spot.RunSpotChecker();
// });

// const BinanceAPI = require('node-binance-api');
// const BinanceOBJ = new BinanceAPI().options({
// 	APIKEY: '7e83028f44e8f39999d803c9697b1936ae82793f8fac7f2162edf82c70bd77d8',
// 	APISECRET: 'a86959578189a3223e2629aa7239cde474ac2916ab8cb48227919abdbdd20825s',
// 	verbose: true,
// 	hedgeMode: true,
// 	test: true
// });

// (async () => {
// 	var ListenKey = await BinanceOBJ.deliveryGetDataStream();

// 	BinanceOBJ.futuresSubscribeSingle(ListenKey.listenKey, (Data) => {

// 	});
// })();

// BinanceOBJ.futuresAggTradeStream('KSMUSDT', (Trades) => {

// 	const {
// 		eventType,
// 		eventTime,
// 		symbol,
// 		aggTradeId,
// 		price,
// 		amount,
// 		total,
// 		firstTradeId,
// 		lastTradeId,
// 		timestamp,
// 		maker
// 	} = Trades;

// });
// const SpotChecker = new (require(`${__dirname}/exchanges/binance/spot-position-checker.js`))();
// SpotChecker.Test();
// SpotChecker.AddOrderToMonitorList('Mamad007', 'rs-210', [ 11112, 3333, 4444, 55 ], [ 333, 444, 555876543 ]);
// SpotChecker.Test();
// SpotChecker.AddOrderToMonitorList('Mamad66', 'rs-211', [ 9876543, 3333, 4444, 55 ], [ 333, 444, 555876543 ]);
// SpotChecker.Test();

// 	SpotChecker.FindPositionNumber(
// 		[
// 			{
// 				OrderListID: 11111,
// 				SLOrderID: 22222,
// 				TPOrderID: 33333,
// 				Price: '37000',
// 				Hit: false,
// 				Type: 'oco_order'
// 			},
// 			{
// 				OrderListID: 11111,
// 				SLOrderID: 22222,
// 				TPOrderID: 33333,
// 				Price: '36000',
// 				Hit: false,
// 				Type: 'oco_order'
// 			},
// 			{
// 				OrderListID: 11111,
// 				SLOrderID: 22222,
// 				TPOrderID: 33333,
// 				Price: '39623',
// 				Hit: false,
// 				Type: 'oco_order'
// 			},
// 			{
// 				OrderListID: 11111,
// 				SLOrderID: 22222,
// 				TPOrderID: 33333,
// 				Price: '31000',
// 				Hit: false,
// 				Type: 'oco_order'
// 			}
// 		],
// 		'39623'
// 	)
// );
// const DataBaseQuery = require(`${__dirname}/../database/database-query`).DatabaseQuery;
// const SignalUpdate = require(`${__dirname}/../analysis/signals-query/signal-update`).SignalUpdate;

// (async () => {
//     try {
//         await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');

//     } catch (DatabaseError) {
//         throw new Error(DatabaseError);
//     }
// })().then(async () => {
// await SignalUpdate.SignalUpdate('rs-3661', {
// 	$set: {
// 		DoneTargets: { type: 'stoploss' }
// 	}
// });

// 	JSON.stringify(
// 		await DataBaseQuery.AsyncMakeDatabaseQuery({
// 			DBQueryMethod: 'Select',
// 			MethodData: {
// 				ModelName: 'exb-signals',
// 				SelectKeys: 'DoneTargets.Hit',
// 				SelectOptions: {},
// 				Where: {
// 					ChatID: 'rs-3661',
// 					'DoneTargets.Type': 'stoploss'
// 				}
// 			}
// 		})
// 	)
// );

// 	await DataBaseQuery.AsyncMakeDatabaseQuery({
// 		DBQueryMethod: 'Update',
// 		MethodData: {
// 			ModelName: 'exb-signals',
// 			MongooseUMO: { multi: false },
// 			NewData: {
// 				$set: {
// 					'DoneTargets.$.Hit': true
// 				}
// 			},
// 			Which: {
// 				ChatID: 'rs-3661',
// 				'DoneTargets.Type': 'stoploss'
// 			}
// 		}
// 	})
// );
// const RequestManager = require(__dirname + '/request-manager');
// global.RequestManager = new RequestManager();

// const BinanceFutures = require(__dirname + '/exchanges/binance/futures').BinanceFutures;
// const BinanceWebSocket = require(__dirname + '/exchanges/binance/websocket');
// const WebSocket = new BinanceWebSocket();
// WebSocket.FuturesPrices('CheckPendingPositions');
// const PositionChecker = new (require(__dirname + '/exchanges/binance/futures-position-checker'))();
// setInterval(async () => {
// 	PositionChecker.CheckOrderIDs(await PositionChecker.ReadyOrderIDs());
// }, 20000);
// });

// const EXBTrade = require(__dirname + '/trade').EXBTrade;

// EXBTrade.ReadyForTrade([
// {
//     ChatID: 'rs-3661',
//     ExchangeType: [ 'binance-futures', 'long' ],
//     Currency: [ 'BTC', 'USDT' ],
//     EnterPrice: [ '57000', '60000' ],
//     Targets: [ '54666', '55480', '57400', '59601' ],
//     OpenTargets: [ '61633', '63994' ],
//     Capital: { Percentage: '2', Leverage: 'isolated', Range: [5, 8] },
//     StopLoss: { CandleSide: 'above', Type: 'normal', Number: '52300' },
//     ForceStop: 'not-set',
//     PositionStatus: 'opening'
// }
// ]);

// const BinanceSpotClass = require(`${__dirname}/exchanges/binance/spot.js`);

// const SpotOBJ = new BinanceSpotClass();

// const BinanceAPI = require('node-binance-api');

// BinanceSpot = new BinanceAPI().options({
// 	APIKEY: 'ojg5cLOsKQtO3ZXqSjPARCUwp31qb8HDzAsgz2IvCKHQGkDVccomh7IDsxdS0bpa',
// 	APISECRET: '8b2T8WXObqdnPcSQY7o5vIcxGs3ktrujDqzfQfVeYqEs7d1iLzQKo4yq4t8EFi8i'
// });

// (async () => {
// 	try {
// 		var WebSocket = BinanceSpot.websockets.trades([ 'BTCUSDT' ], (trades) => {

// 		});

// 		setTimeout(() => {
// 			BinanceSpot.websockets.terminate(WebSocket);

// 		}, 10000);
// 		// BinanceSpot.websockets.trades([ 'KSMUSDT' ], (trades) => {

// 		// 	// let {
// 		// 	// 	e: eventType,
// 		// 	// 	E: eventTime,
// 		// 	// 	s: symbol,
// 		// 	// 	p: price,
// 		// 	// 	q: quantity,
// 		// 	// 	m: maker,
// 		// 	// 	a: tradeId,
// 		// 	// 	b: Buyer
// 		// 	// } = trades;

// 		// 	// // if (tradeId.toString() === '371040201' || Buyer.toString() === '371040201') {

// 		// 	// // 		symbol + ' trade update. price: ' + price + ', quantity: ' + quantity + ', maker: ' + maker
// 		// 	// // 	);
// 		// 	// // }

// 		// 	// if (tradeId.toString() === '37057301') {

// 		// 	// }

// 		// 	// if (tradeId.toString() === '371088868') {

// 		// 	// }

// 		// 	// if (tradeId.toString() === '37057301') {

// 		// 	// }
// 		// });

// 		// await BinanceSpot.sell('LTCUSDT', 0.089, 160, {
// 		// 	type: 'OCO',
// 		// 	price: 175,
// 		// 	quantity: parseFloat(0.089),
// 		// 	side: 'SELL',
// 		// 	stopLimitPrice: 160,
// 		// 	stopLimitTimeInForce: 'GTC',
// 		// 	stopPrice: 160,
// 		// 	symbol: 'LTCUSDT'
// 		// })
// 		// BinanceSpot.cancel('KSMUSDT', 35062313, (error, response, symbol) => {

// 		// })
// 		// BinanceSpot.transferMainToFutures('USDT', 10, function(Return) {

// 		// });
// 		// var data = await BinanceSpot.transferFuturesToMain('USDT', 10);

// 		// let Balances = await BinanceSpot.futuresBalance();

// 		// let USDTData = Balances.filter((Balance) => {

// 		// 	return Balance.asset === 'USDT';
// 		// });

// 		// return parseFloat(USDTData.balance);

// 		// BinanceSpot.balance((error, balances) => {

// 		// });
// 		// );
// 	} catch (ReturnError) {

// 	}
// })();

// 	(async () => {
// 		// var BinanceFutures = new BinanceAPI().options({
// 		// 	APIKEY: '7e83028f44e8f39999d803c9697b1936ae82793f8fac7f2162edf82c70bd77d8',
// 		// 	APISECRET: 'a86959578189a3223e2629aa7239cde474ac2916ab8cb48227919abdbdd20825',
// 		// 	test: true
// 		// });

// var BinanceSpot = new BinanceAPI().options({
// 	APIKEY: 'SUb3NL0H9wbpMKUhZ9yAwylh4z9gbPyrxDRZp2fwx9bwrLspXiPHVYr6qpSk8MxM',
// 	APISECRET: 'IYA5Ziv6td7nOPzPOk8PMPXHmiMzfHNT0l406q3vBSxUgVzoduPaHA1rFJxBOqkV',
// 	verbose: true
// });

// JSON.stringify(await BinanceFutures.futuresExchangeInfo());
// await BinanceFutures.futuresMarketBuy('BTCUSDT', 0.056, {
// 	newOrderRespType: 'RESULT',
// 	positionSide: 'SHORT',
// 	side: 'SELL'
// });

// try {
// 	// BinanceSpot.openOrders('BTCUSDT', (error, openOrders, symbol) => {

// 	// });
// 	// let Quantity = parseFloat('0.100');

// 	let ticker = await BinanceSpot.prices();

// } catch (RError) {

// }

// BinanceSpot.cancel('TRXUSDT', 315246664, (error, response, symbol) => {

// });
// })();

// var JSONSymbol =
//     '';
// JSONSymbol = JSON.parse(JSONSymbol);
// var Output = {};
// var test = JSONSymbol.symbols.map((item) => {
    // var FilteredLOT = item.filters.filter((item2) => {
    //     return item2.filterType === 'LOT_SIZE';
    // });
    // var FilteredPercent = item.filters.filter((item2) => {
    //     return item2.filterType === 'PERCENT_PRICE';
    // });

    // Output[item.symbol] = {
    //     QuantityPrecision: item.quantityPrecision,
    //     MinQuantity: FilteredLOT[0].minQty,
    //     MaxQuantity: FilteredLOT[0].maxQty,
    //     PercentPrice: {
    //         MultiplierDecimal: FilteredPercent[0].multiplierDecimal,
    //         MultiplierDown: FilteredPercent[0].multiplierDown,
    //         MultiplierUp: FilteredPercent[0].multiplierUp
    //     }
    // };
// });

function precision(a) {
	a = parseFloat(a);
	var e = 1;
	while (Math.round(a * e) / e !== a) e *= 10;
	return Math.ceil(Math.log(e) / Math.LN10);
}

const FS = require('fs');

const SpotSymbolData = require(`${__dirname}/../../../../storage/exchange-data/symbol-data-spot.json`);

var Output = {};
var test = SpotSymbolData.symbols.map((item) => {
	var FilteredLOT = item.filters.filter((item2) => {
		return item2.filterType === 'LOT_SIZE';
	});
	var FilteredPercent = item.filters.filter((item2) => {
		return item2.filterType === 'PERCENT_PRICE';
	});

	Output[item.symbol] = {
		QuantityPrecision: precision(FilteredLOT[0].minQty),
		MinQuantity: FilteredLOT[0].minQty,
		MaxQuantity: FilteredLOT[0].maxQty,
		PercentPrice: {
			MultiplierDecimal: FilteredPercent[0].multiplierDecimal,
			MultiplierDown: FilteredPercent[0].multiplierDown,
			MultiplierUp: FilteredPercent[0].multiplierUp
		}
	};
});

FS.writeFileSync(`${__dirname}/../../../../storage/exchange-data/symbol-data-spot.json`, JSON.stringify(Output));
