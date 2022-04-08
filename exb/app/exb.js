const DataBaseQuery = require('../components/database/database-query').DatabaseQuery;
const MainLog = require('../components/trade/bot-log/main-signal-log').MainSignalLog;

const SignalsWatcher = require('../components/watcher/signal-watcher').SignalWatcher;
const RequestManager = require('../components/trade/request-manager');
const ChartListener = require('../components/trade/chart-listener');

const BinanceWebSocket = require('../components/trade/exchanges/binance/websocket');

const BinanceFutures = require('../components/trade/exchanges/binance/futures');
// const FuturesPositionChecker = require('../components/trade/exchanges/binance/futures-position-checker');

const BinanceSpot = require('../components/trade/exchanges/binance/spot');
// const SpotPositionChecker = require('../components/trade/exchanges/binance/spot-position-checker');

const Logger = require('../components/main/logger').Logger;

global.SpotPositionChecker = new (require(`../components/trade/exchanges/binance/spot-position-checker.js`))();
global.FuturesPositionChecker = new (require(`../components/trade/exchanges/binance/futures-position-checker.js`))();

/* --------------------------- Connect to database --------------------------- */
(async () => {
	try {
		// await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
		await DataBaseQuery.DatabaseConnect(
			'mongodb+srv://MrWolf:Aa106677889@exbdatabse.xnwy0.mongodb.net/exbdatabse?retryWrites=true&w=majority'
		);

		// Set logger global
		global.Logger = Logger;
	} catch (DatabaseError) {
		global.Logger.error(DatabaseError, __filename);
	}
})().then(async () => {
	try {
		global.Logger.info('Database connected!');

		/* -------------------------------------------------------------------------- */
		/*                           Define global variables                          */
		/* -------------------------------------------------------------------------- */
		global.SpotMonitorList = {
			TakeProfit: [],
			StopLoss: []
		}; // Spot oco order checker
		global.FuturesMonitorList = {}; // Futures order checker

		// global last proxy
		global.LastProxy = '';

		/* -------------------------------------------------------------------------- */
		/*                               Request manager                              */
		/* -------------------------------------------------------------------------- */
		// Deprecated
		// global.RequestManager = new RequestManager();

		/* -------------------------------------------------------------------------- */
		/*                               Signal watcher                               */
		/* -------------------------------------------------------------------------- */
		SignalsWatcher.AddWatcherToFiles([ 'Rastad Signals', 'exbforcesignal' ]);

		/* -------------------------------------------------------------------------- */
		/*                              Binance websocket                             */
		/* -------------------------------------------------------------------------- */
		global.BinanceWebsocket = new BinanceWebSocket();

		/* -------------------------------------------------------------------------- */
		/*                               Binance futures                              */
		/* -------------------------------------------------------------------------- */
		global.BinanceFutures = new BinanceFutures();
		// global.BinanceFutures.AddFromDatabase();
		global.BinanceWebsocket.FuturesPrices();

		/* ------------------------ Futures positions checker ----------------------- */
		global.FuturesPositionChecker.RunFuturesChecker();

		/* -------------------------------------------------------------------------- */
		/*                                Binance spot                                */
		/* -------------------------------------------------------------------------- */
		global.BinanceSpot = new BinanceSpot();

		// Make sure websocket connected
		global.ChartListener = new ChartListener();

		// Create websocket message listener
		global.SpotPositionChecker.RunSpotChecker();

		// setInterval(() => {
		// 	console.log(global.SpotMonitorList, 'global.SpotMonitorList');
		// 	console.log(global.FuturesMonitorList, 'global.FuturesMonitorList');
		// }, 20000);

		// Add signals from database
		// global.BinanceSpot.AddFromDatabase();

		MainLog.Futures.PriceStream();
		global.Logger.info('EXB bot running!');
	} catch (Error) {
		global.Logger.error(Error, __filename);
	}
});
