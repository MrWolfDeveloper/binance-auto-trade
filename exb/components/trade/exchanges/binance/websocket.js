const BinanceFutures = require(`${__dirname}/futures.js`).BinanceFutures;
const BinanceSpot = require(`${__dirname}/spot.js`);

const BinanceAPI = require('node-binance-api');
const WebSocket = require('ws');
class BinanceWebSocket {
	// We don not need any more.
	// static API_KEY_FUTURES = '7e83028f44e8f39999d803c9697b1936ae82793f8fac7f2162edf82c70bd77d8';
	// static API_SECRET_FUTURES = 'a86959578189a3223e2629aa7239cde474ac2916ab8cb48227919abdbdd20825';

	static API_KEY_SPOT = '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K';
	static API_SECRET_SPOT = 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM';

	SPOT_TIMEOUT = {};
	BINANCE;
	BINANCE_SPOT_WS_CONNECTION;
	// An array of currencies whose prices are required
	SPOT_REQUESTS_PRICES = [];
	// Last prices of currencies whose prices are required
	SPOT_LAST_PRICES = {};
	SPOT_ENDPOINT_PRICES = '';

	// Create connections
	constructor() {
		global.Logger.info('Connecting to stream.binance.com ...');

		this.BINANCE = new BinanceAPI().options({
			APIKEY: this.API_KEY_SPOT,
			APISECRET: this.API_SECRET_SPOT,
			verbose: true
		});
	}

	ReconnectBinanceStream() {
		global.Logger.info('Reconnecting to stream.binance.com ...', __filename);

		setTimeout(() => {
			this.ConnectBinanceStream();

			this.SPOT_REQUESTS_PRICES.map((Currency, CurrencyIndex) => {
				this.BINANCE_SPOT_WS_CONNECTION.send(
					`{"method":"SUBSCRIBE","params":["${Currency.toLowerCase()}@aggTrade"],"id":2}`
				);

				if (CurrencyIndex === this.SPOT_REQUESTS_PRICES.length - 1) {
					setTimeout(() => {
						this.SpotPrices();
					}, 1000);
				}
			});
		}, 1000);
	}

	// ConnectBinanceStream() {
	// 	this.BINANCE_SPOT_WS_CONNECTION = new WebSocket('wss://stream.binance.com/stream', {
	// 		protocolVersion: 8,
	// 		rejectUnauthorized: false,
	// 		Origin: 'http://localhost:3000'
	// 	});
	// }

	// Futures
	FuturesPrices() {
		global.BinanceFutures.FuturesMarkPriceStream();
	}

	// Spot
	// SpotWebsocketChecker() {
	// 	return new Promise((Resolve, Reject) => {
	// 		var Resolved = false;

	// 		this.BINANCE_SPOT_WS_CONNECTION.on('open', () => {
	// 			Resolved = true;

	// 			Resolve(true);
	// 		});

	// 		setTimeout(() => {
	// 			if (!Resolved) {
	// 				global.Logger.error('SpotWebsocketChecker was rejcted!');

	// 				Reject(false);
	// 			}
	// 		}, 10000);

	// 		// Reconnect websocket
	// 		this.BINANCE_SPOT_WS_CONNECTION.on('close', (error) => {
	// 			console.log(error, 'error');
	// 			global.Logger.error('stream.binance.com Websocket closed!');

	// 			this.ReconnectBinanceStream();
	// 		});
	// 	});
	// }

	AddSpotRequestPrices(Currency) {
		let CurrencyIndex = this.SPOT_REQUESTS_PRICES.findIndex((Symbol) => Symbol === Currency);
		if (CurrencyIndex === -1) {
			console.log(Currency, 'Currency');

			this.SPOT_REQUESTS_PRICES.push(Currency);
			this.SPOT_LAST_PRICES[Currency] = '0.00';
			this.SPOT_TIMEOUT[Currency] = null;

			if (this.SPOT_ENDPOINT_PRICES != '') this.BINANCE.websockets.terminate(this.SPOT_ENDPOINT_PRICES);

			this.SPOT_ENDPOINT_PRICES = '';

			this.SpotPrices();

			global.Logger.info(`${Currency} added to binance spot price websocket.`);
		}
	}

	SpotPrices() {
		console.log(this.SPOT_REQUESTS_PRICES.length, 'this.SPOT_REQUESTS_PRICES');
		// if (this.SPOT_REQUESTS_PRICES.length) {
		this.SPOT_ENDPOINT_PRICES = this.BINANCE.websockets.candlesticks(
			this.SPOT_REQUESTS_PRICES,
			'1m',
			(CandleSticks) => {
				let { k: Ticks, s: Symbol } = CandleSticks;
				let { c: Close } = Ticks;

				var self = this;

				let Currency = Symbol;
				this.SPOT_LAST_PRICES[Currency] = parseFloat(Close);

				if (this.SPOT_TIMEOUT[Currency] === null) {
					this.SPOT_TIMEOUT[Currency] = setTimeout(function() {
						self.SPOT_TIMEOUT[Currency] = null;
					}, 2000);

					global.BinanceSpot.CheckPendingPositions(this.SPOT_LAST_PRICES);
				}
			}
		);
		// }

		// this.BINANCE_SPOT_WS_CONNECTION.on('message', (Data) => {
		// 	Data = JSON.parse(Data);

		// 	var self = this;

		// 	if (!Data.data) return;

		// 	let Currency = Data.data.s;
		// 	this.SPOT_LAST_PRICES[Currency] = parseFloat(Data.data.p);

		// 	if (this.SPOT_TIMEOUT[Currency] === null) {
		// 		this.SPOT_TIMEOUT[Currency] = setTimeout(function() {
		// 			self.SPOT_TIMEOUT[Currency] = null;
		// 		}, 2000);

		// 		global.BinanceSpot.CheckPendingPositions(this.SPOT_LAST_PRICES);
		// 	}
		// });
	}
}

module.exports = BinanceWebSocket;
