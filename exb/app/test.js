// // const Binance = new (require('node-binance-api'))().options({
// // 	APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
// // 	APISECRET: 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM'
// // });

// // const BigNumber = require('bignumber.js');

// // Binance.buy('ETHUSDT', 0.0035, 4010, { type: 'LIMIT' }, (error, response) => {
// // 	console.info('Limit Buy response', response);
// // 	console.info('order id: ' + response.orderId);
// // });

// const DataBaseQuery = require('../components/database/database-query').DatabaseQuery;
// const SureSignal = require('../components/trade/exchanges/binance/sure-signal').SureAboutSignal;

// (async () => {
// 	try {
// 		// await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
// 		await DataBaseQuery.DatabaseConnect(
// 			'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
// 		);
// 	} catch (DatabaseError) {
// 		console.error(DatabaseError);
// 	}
// })().then(async () => {
// 	await SureSignal.FuturesSure('rs-6214');
// });

// // let num = new BigNumber(OrderData.orderId).toString();
// // // let denom = new BigNumber(10).pow(16);
// // // let ans = num.dividedBy(denom).toNumber();
// // console.log(num);

// var JSONbig = require('json-bigint');

// // var test = '{"orderId":8389765513251813957}';

// // var r1 = JSONbig.parse(test);

// // console.log(JSON.parse(JSON.stringify(r1)).orderId);

// // console.log(JSONbig.stringify(r1));

var BinanceAPI = require('node-binance-api');
var WebSocket = require('ws');

var Binance = new BinanceAPI().options({
	APIKEY: 'MwsD1sdWdr6xVWQXYHKixP4id3RAE40G34BdzhR3G4tI5SQYskDNf6ld5OI5IjGH',
	APISECRET: 'KLKYvTSih8DAfGn6swfuKZQCkXa0kLSRUy00JgJRCVx4FdD1UYMsbyU2qCX8SNG2',
	verbose: true,
	hedgeMode: true
});

(async () => {
	// var ListenKey = await Binance.futuresGetDataStream();
	var flb = await Binance.futuresLeverageBracket('ALPHAUSDT');
	console.log(flb[0].brackets);
})();

// 	console.log(ListenKey);

// 	// var WSOBJ = Binance.futuresSubscribeSingle(ListenKey.listenKey, (Data) => {
// 	// 	var { e: Event } = Data;

// 	// 	console.log(Data, 'Data');
// 	// });

// 	// setTimeout(() => {
// 	// 	WSOBJ.terminate();
// 	// }, 15000);

// 	var WS = new WebSocket('wss://fstream.binance.com/ws/' + ListenKey.listenKey);

// 	WS.reconnect = true;
// 	WS.endpoint = ListenKey.listenKey;
// 	WS.isAlive = false;
// 	WS.on('open', () => {
// 		console.log('Websocket opened');
// 	});
// 	WS.on('pong', () => {
// 		console.log('Websocket pong');
// 	});
// 	WS.on('error', (error) => {
// 		console.log(error);
// 		console.log('Websocket error');
// 	});
// 	WS.on('close', () => {
// 		console.log('Websocket closed');
// 	});
// 	WS.on('message', (data) => {
// 		try {
// 			console.log(data);
// 		} catch (error) {
// 			console.error(error);
// 		}
// 	});
// })();

// //

/* ---------------------------- Sure about signal --------------------------- */

// function ToFixed(Number, Fixed) {
// 	var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
// 	return Number.toString().match(Regex)[0];
// }

// let signal = `📶 #ROSE/USDT

// 📈Enter price: 0.32 🔛 0.35

// 1️⃣ Target: 0.38

// 2️⃣ Target: 0.43

// 3️⃣ Target: 0.47

// 4️⃣ Target: 0.52

// 5️⃣ Open Targets:
// 0.58

// ⛔️ Normal Stop Loss: 0.295

// ⚠️ 3% CAPITAL;`;

// var SecondeAsset = 'USDT';
// var Quantity = 0.004;
// var Prices = [ '41040.99', '40440.39', '39639.6', '38838.79', '38037.99' ];
// var QuantityPrecision = 3;

// var TargetCount = 0;
// var OverCurrencyQuantity = false;
// var TargetsQuantity = 0.0;
// var StopLoss = '44100';

// var MinimumOrder;
// if (SecondeAsset === 'USDT') MinimumOrder = 10;
// if (SecondeAsset === 'BTC') MinimumOrder = 0.0003;

// while (!OverCurrencyQuantity) {
// 	var TargetsQuantity = Quantity / (Prices.length - TargetCount);
// 	TargetsQuantity = ToFixed(TargetsQuantity, QuantityPrecision);

// 	if (StopLoss * TargetsQuantity >= MinimumOrder) OverCurrencyQuantity = true;
// 	else TargetCount++;
// }

// var NewTargetsQuantity = ToFixed(TargetsQuantity, QuantityPrecision);
// // var NewTargetsQuantity = TargetsQuantity;

// // Sort prices
// Prices = Prices.sort(function(a, b) {
// 	return parseFloat(b) - parseFloat(a);
// });

// if (TargetCount) Prices.splice(-Math.abs(TargetCount));

// var RemainingQuantity = ToFixed((TargetsQuantity - NewTargetsQuantity) * Prices.length, QuantityPrecision);

// var OtherRemainingQuantity = NewTargetsQuantity * Prices.length;

// console.log(NewTargetsQuantity, 'NewTargetsQuantityHere');
// console.log(Prices.length, 'Prices.length');

// if (OtherRemainingQuantity < Quantity)
// 	OtherRemainingQuantity = ToFixed(Quantity - OtherRemainingQuantity, QuantityPrecision);
// else OtherRemainingQuantity = 0;

// console.log(OtherRemainingQuantity, 'OtherRemainingQuantity');
// console.log(Prices, 'Prices');

// Prices.map(async (Price, PriceIndex) => {
// 	var LocalQuantity = 0.0;

// 	if (!PriceIndex)
// 		LocalQuantity =
// 			parseFloat(NewTargetsQuantity) + parseFloat(RemainingQuantity) + parseFloat(OtherRemainingQuantity);
// 	else LocalQuantity = NewTargetsQuantity;

// 	console.log(LocalQuantity, 'LocalQuantityHere');
// });

// const Signal = `📍SIGNAL ID: #0599📍
// COIN: $ETC/USDT (3-5x)
// Direction: LONG📈
// ➖➖➖➖➖➖➖
// Mid/long term Killer gem that about to make more than our month😘

// ENTRY: 25 - 28.50
// OTE: 26.78

// TARGETS
// Short Term: 28.90 - 29.50 - 30.50 - 33 - 34.50 - 36
// Mid Term: 40 - 44 - 49 - 54 - 60 - 68 - 77

// STOP LOSS: 22.67
// ➖➖➖➖➖➖➖
// This message cannot be forwarded or replicated
// - Binance Killers®.`;

// const Analysis = require('../components/analysis/channels/BinanceKillers').BinanceKillers;

// console.log(Analysis.AnalysisContent('test'));
