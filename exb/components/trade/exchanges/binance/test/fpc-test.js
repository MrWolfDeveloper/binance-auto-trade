// const FPC = new (require(`${__dirname}/../futures-position-checker.js`))();
const Binance = require('node-binance-api');
const ProxyHandler = require(`${__dirname}/../../../proxy.js`).ProxyHandler;
const Futures = new (require(`${__dirname}/../futures.js`))();
const DataBaseQuery = require(`${__dirname}/../../../../database/database-query.js`).DatabaseQuery;

(async () => {
	// await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
	await DataBaseQuery.DatabaseConnect(
		'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
	);
})().then(async () => {
	var ReturnProxy = await ProxyHandler.BestProxyIP();
	var BC = new Binance().options({
		APIKEY: 'wpdmMxZtI0kdP6eZPxBpVwLZEzaXRO3P6edcJbt0HyabnEoIutYhm9u0Af6n3Hfj',
		APISECRET: 'k3XbqpadX1OnrLBOB4ChDxlIxDyH5lDivGpVkUW0x0bvdiI7cXyPYADT5MOwwHiQ',
		verbose: true,
		hedgeMode: true,
		proxy: ReturnProxy
	});

	Futures.OrderShortPosition('KSMUSDT', 0.02, 345, '', '', true, BC);
	// await FPC.UpdateMainSignal('rsf-13', 'target-hit', {
	// 	TargetIndex: 1,
	// 	TargetNumber: 340,
	// 	TargetHitDate: new Date(Date.now())
	// 	// StoplossHitDate: new Date(Date.now())
	// });
	// console.log(await FPC.FindTargetData('donooko', 'rsf-5554', 11111));
	// console.log('Test passed ...');
	// await FPC.TakeProfitHited('HBARUSDT;rs-5470;707818634', 'donooko');
});
