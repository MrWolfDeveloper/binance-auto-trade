const BinanceAPI = require('node-binance-api');
const BigNumber = require('bignumber.js');

const DatabaseQuery = require('../../../database/database-query').DatabaseQuery;
const SignalUpdate = require(`${__dirname}/../../../analysis/signals-query/signal-update`).SignalUpdate;
const HandleTradeError = require(`${__dirname}/../../handle-trade-errors`).HandleTradeError;
const BinanceTools = require(`${__dirname}/binance-tools.js`);

const User = require(`${__dirname}/../../../user/user.js`).User;
const ProxyHandler = require(`${__dirname}/../../proxy.js`).ProxyHandler;

const SpotSymbolData = require(`${__dirname}/../../../../../../storage/exchange-data/symbol-data-spot.json`);
class MainBinanceSpot extends BinanceTools {
	API_KEY;
	API_SECRET;
	// static USDT_BALANCE = 10000;
	// static BTC_BALANCE = 2;

	SPOT_CONNECTION;

	PendingPositions = {
		Open: {},
		Opening: {}
	};

	constructor() {
		super('spot');

		this.API_KEY = '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K';
		this.API_SECRET = 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM';

		// this.API_KEY = 'bGnCPKLB46evNLsCaNi6w1UvPkq1Xfbb463oz9zLSjrQlclNW3PCAfqp2uAG0aSW';
		// this.API_SECRET = 'zHyxwmb1i3wM6eKYT44gTkg2xfoCzSLgDF0AvOTJGxBeiWAQ0s4HH16eHZKq5e9E';

		this.SPOT_CONNECTION = new BinanceAPI().options({
			APIKEY: this.API_KEY,
			APISECRET: this.API_SECRET,
			verbose: true
		});

		this.CheckPendingPositions = this.CheckPendingPositions.bind(this);
		this.AddToPendingPositions = this.AddToPendingPositions.bind(this);
		this.RefreshPendingRequest = this.RefreshPendingRequest.bind(this);
		this.Market = this.Market.bind(this);
		this.Order = this.Order.bind(this);
		this.AddTP = this.AddTP.bind(this);
		this.AddSL = this.AddSL.bind(this);

		this.USDT_BALANCE_SPOT = 1000;
		this.BTC_BALANCE_SPOT = 0.05;
	}

	async GetSignal(ChatID) {
		try {
			var Signal = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys:
						'ChatID ChannelID ExchangeType Currency EnterPrice PositionOrderID OpenTargets Targets DoneTargets Capital EntryPrice Quantity StopLoss StopLossHitDate ForceStop PositionStatus SignalDate PositionDate TradeError',
					SelectOptions: {},
					Where: {
						ChatID: ChatID
					}
				}
			});

			return Signal[1][0];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}

	async MultiUserTrade(Signal, CurrencyPrice) {
		const UsersPack = await User.GetTradeUsers('Spot', Signal.Currency[1]);

		// console.log(UserPack, 'UserPack');

		// Object.freeze(Signal.Targets);

		// console.log(Signal.Targets, 'Main Signal.Targets');

		// Market currency
		UsersPack.map((UserList, UserIndex) => {
			setTimeout(() => {
				UserList.map(async (UserItem) => {
					Signal = await this.GetSignal(Signal.ChatID);

					const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

					// Sort prices
					Signal.Targets = Signal.Targets.sort(function(a, b) {
						return parseFloat(a) - parseFloat(b);
					});

					console.log(Signal.Targets, 'Signal.Targets');

					/* ------------------- Add first open target and stoploss ------------------- */
					if (Signal.OpenTargets[0]) Signal.Targets.push(Signal.OpenTargets[0]);

					var UserPrices = Signal.Targets;

					var { BinanceConnection } = UserItem;

					try {
						/* ---------------------------- Balance Check ---------------------------- */
						let AssetBalance = await this.SpotBalanceCheck(Signal.Currency[1], BinanceConnection);

						if (Signal.Currency[1] === 'USDT') {
							var AmountRequired = parseFloat(
								Signal.Capital.Percentage *
									parseInt(UserItem.ExchangesData.Binance.SpotCeilingAmount.USDT) /
									100
							);

							if (AmountRequired > parseFloat(AssetBalance)) {
								let Difference = AmountRequired - parseFloat(AssetBalance);
								Difference = Difference + AmountRequired * 0.3;

								console.log(
									await this.FuturesToSpot('USDT', Math.ceil(Difference), BinanceConnection),
									'FuturesToSpot'
								);
							}

							await this.Sleep(2000);
						}

						/* ------------------------- Calculation quantity ------------------------ */
						var Quantity = await this.CalculationQuantity(
							{
								USDT_BALANCE_SPOT: UserItem.ExchangesData.Binance.SpotCeilingAmount.USDT,
								BTC_BALANCE_SPOT: UserItem.ExchangesData.Binance.SpotCeilingAmount.BTC
							},
							Signal.Capital.Percentage,
							Currency,
							parseFloat(CurrencyPrice),
							'binance-spot',
							'',
							Signal.Currency[1]
						);

						/* ------------------------ Market and update signal ------------------------ */
						const MarketStatus = await this.Market(
							Currency,
							Quantity.CalculatedQuantity,
							Signal.ChatID,
							UserItem.BinanceConnection
						);
						// 1
						// const MarketStatus = true;

						if (MarketStatus) {
							User.AddSignalToUser(UserItem.Username, {
								SignalChatID: Signal.ChatID,
								SignalEntryDate: new Date(Date.now()),
								ExchangeType: Signal.ExchangeType,
								Currency: Signal.Currency,
								Targets: Signal.Targets,
								DoneTargets: [],
								PositionStatus: 'open',
								Capital: Signal.Capital,
								StopLoss: Signal.StopLoss,
								Quantity: Quantity.CalculatedQuantity,
								EntryPrice: parseFloat(CurrencyPrice),
								PositionOrderID: MarketStatus.orderId.toString()
							});
							// 2

							/* ---------------- Calculate new quantity for targets order ---------------- */
							const NewQuantity = this.ToFixed(
								Quantity.CalculatedQuantity * 0.98,
								SpotSymbolData[Currency].QuantityPrecision
							);

							console.log(NewQuantity, 'NewQuantity', Signal.ChatID, UserItem.Username);

							/* ------------------------------- Open orders ------------------------------ */
							if (Signal.StopLoss.Type === 'normal') {
								// Add oco order for signal
								setTimeout(async () => {
									console.log(UserPrices, UserItem.Username, 'Outside');

									await this.AddTP(
										Currency,
										NewQuantity,
										UserPrices,
										Signal.StopLoss.Number,
										Signal.ChatID,
										Signal.Currency[1],
										BinanceConnection,
										UserItem.Username
									);
									// 3
								}, 1000);
							} else if (Signal.StopLoss.Type === 'manual') {
								setTimeout(async () => {
									console.log('TP Manual');
									// Add candle take profit
									this.AddTPCandle(
										Currency,
										NewQuantity,
										UserPrices,
										Signal.ChatID,
										Signal.Currency[1],
										BinanceConnection,
										UserItem.Username
									);

									// Add candle stoploss
									global.ChartListener.AddCandleStopLossListener(
										Currency,
										Signal.StopLoss.CandleInterval,
										Signal.StopLoss.CandleSide,
										Signal.StopLoss.Number,
										Signal.ChatID
									);
									// 4
								}, 1000);
							}
						} else {
							User.AddSignalToUser(UserItem.Username, {
								SignalChatID: Signal.ChatID,
								ExchangeType: Signal.ExchangeType,
								Currency: Signal.Currency,
								Targets: UserPrices,
								DoneTargets: [],
								PositionStatus: 'error-close',
								Capital: Signal.Capital,
								StopLoss: Signal.StopLoss,
								Quantity: Quantity.CalculatedQuantity,
								EntryPrice: 'error',
								PositionOrderID: 'error'
							});
						}
					} catch (ReturnError) {}
				});
			}, 2000 * UserIndex);
		});
	}

	SpotBalanceCheck(Currency, BinanceConnection) {
		return new Promise((Resolve, Reject) => {
			BinanceConnection.balance((Error, Balances) => {
				if (Error) return Reject(Error);

				return Resolve(Balances[Currency].available);
			});
		});
	}

	async FuturesToSpot(Asset, Amount, BinanceConnection) {
		let TranStatus = await BinanceConnection.transferFuturesToMain(Asset, Amount);

		if (!TranStatus.tranId) return false;

		return true;
	}

	CheckPendingPositions(PricesFilter) {
		// console.log(this.PendingPositions, 'this.PendingPositions');
		// Check opening positions
		Object.keys(this.PendingPositions.Opening).map((SignalCurrency) => {
			this.PendingPositions.Opening[SignalCurrency].map(async (Signal, SignalIndex) => {
				var InRange = false;

				Signal.EnterPrice = Signal.EnterPrice.sort((a, b) => parseFloat(a) - parseFloat(b));

				if (
					parseFloat(PricesFilter[SignalCurrency]) >= parseFloat(Signal.EnterPrice[0]) &&
					parseFloat(PricesFilter[SignalCurrency]) <= parseFloat(Signal.EnterPrice[1])
				) {
					InRange = true;
				}

				if (InRange) {
					if (!this.PendingPositions.Open[SignalCurrency]) this.PendingPositions.Open[SignalCurrency] = [];

					this.PendingPositions.Open[SignalCurrency].push(Signal);
					this.PendingPositions.Opening[SignalCurrency].splice(SignalIndex, 1);

					// Update signal entry price
					await SignalUpdate.SignalUpdate(Signal.ChatID, {
						$set: {
							EntryPrice: PricesFilter[SignalCurrency]
						}
					});

					// Add signals to all user account
					this.MultiUserTrade(Signal, PricesFilter[SignalCurrency]);
				}
			});
		});

		this.RefreshPendingRequest();
	}

	async Trade(Signal) {
		// Wrong signal
		if (Signal.ExchangeType[0] != 'binance-spot') {
			HandleTradeError.SignalError(Signal, -7000);
		} else {
			console.log(Signal, 'Signal');
			this.AddToPendingPositions(Signal);
		}
	}

	AddToPendingPositions(Signal) {
		let { Currency, ExchangeType } = Signal;

		if (ExchangeType[0] != 'binance-spot') return;

		Currency = Currency.toString().replace(/(,| )/gi, '');

		try {
			// Add currency to websocket
			console.log('Add spot Price');
			global.BinanceWebsocket.AddSpotRequestPrices(Currency);

			if (!this.PendingPositions.Opening[Currency]) this.PendingPositions.Opening[Currency] = [];

			this.PendingPositions.Opening[Currency].push(Signal);
		} catch (AddError) {}
	}

	RefreshPendingRequest() {
		// Refresh opening signals
		Object.keys(this.PendingPositions.Opening).map((SignalCurrency) => {
			this.PendingPositions.Opening[SignalCurrency].map(async (Signal, SignalIndex) => {
				if (this.TimeDifference(Signal.SignalDate) > 480) {
					// Delete signal
					this.PendingPositions.Opening[SignalCurrency].splice(SignalIndex, 1);

					// Update signal
					await SignalUpdate.SignalUpdate(Signal.ChatID, {
						$set: {
							PositionStatus: 'expired'
						}
					});
				}
			});
		});

		// Refresh open signals
		Object.keys(this.PendingPositions.Open).map((SignalCurrency) => {
			this.PendingPositions.Open[SignalCurrency].map(async (Signal, SignalIndex) => {
				if (this.TimeDifference(Signal.SignalDate) > 30) {
					// Delete signal
					this.PendingPositions.Open[SignalCurrency].splice(SignalIndex, 1);
				}
			});
		});
	}

	async Market(Currency, Quantity, ChatID, BinanceConnection) {
		try {
			const OrderStatus = await BinanceConnection.marketBuy(Currency, this.ScientificToDecimal(Quantity));

			if (this.CheckAPIReturn(OrderStatus)) {
				// await SignalUpdate.SignalUpdate(ChatID, {
				//     $set: {
				//         PositionOrderID: OrderStatus.orderId
				//     }
				// });

				return OrderStatus;
			} else {
				// await SignalUpdate.SignalError({ ChatID: ChatID }, -7003);

				return false;
			}
		} catch (ReturnError) {}
	}

	async OrderOCO(Currency, Quantity, Price, StopLoss, BinanceConnection) {
		try {
			console.log(Price, 'PriceOCO');

			let FixedQuantity = parseFloat(
				this.ToFixed(parseFloat(Quantity), SpotSymbolData[Currency].QuantityPrecision)
			);

			Price = this.ToFixed(Price, SpotSymbolData[Currency].PricePrecision);
			StopLoss = this.ToFixed(StopLoss, SpotSymbolData[Currency].PricePrecision);

			return await BinanceConnection.sell(
				Currency,
				this.ScientificToDecimal(FixedQuantity),
				this.ScientificToDecimal(parseFloat(Price)),
				{
					type: 'OCO',
					price: this.ScientificToDecimal(Price),
					quantity: this.ScientificToDecimal(FixedQuantity),
					side: 'SELL',
					stopLimitPrice: this.ScientificToDecimal(StopLoss),
					stopLimitTimeInForce: 'GTC',
					stopPrice: this.ScientificToDecimal(StopLoss),
					symbol: Currency
				}
			);
		} catch (ReturnError) {
			console.log(ReturnError, 'ReturnErrorOCO');
			return false;
		}
	}

	async Order(Currency, Quantity, Price, BinanceConnection) {
		console.log(Currency, Quantity, Price, 'Currency, Quantity, Price ORDER');
		try {
			// return await global.BinanceSpot.BinanceConnection.sell(Currency, parseFloat(Quantity), Price, {
			// 	stopPrice: Price,
			// 	type: Type
			// });
			Price = this.ToFixed(Price, SpotSymbolData[Currency].PricePrecision);
			console.log(this.ScientificToDecimal(Price), 'Price On Order');

			return await BinanceConnection.sell(
				Currency,
				this.ScientificToDecimal(Quantity),
				this.ScientificToDecimal(Price)
			);
		} catch (ReturnError) {
			// console.log(ReturnError, 'OrderError');
			return false;
		}

		// return new Promise((Resolve, Reject) => {
		// 	global.BinanceSpot.buy(Currency, Quantity, Price, { type: 'LIMIT' }, (Error, Response) => {
		// 		if (Error) Reject(Error);

		// 		Resolve(Response);
		// 	});
		// });
	}

	ToFixed(Number, Fixed) {
		// var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
		// return Number.toString().match(Regex)[0];

		return parseFloat(Number).toFixed(Fixed);
	}

	AddTP(Currency, Quantity, Prices, StopLoss, ChatID, SecondeAsset, BinanceConnection, Username) {
		console.log(Prices, 'Prices inside add tp');

		var TargetCount = 0;
		var OverCurrencyQuantity = false;
		var TargetsQuantity = 0.0;
		var MinimumOrder;

		if (SecondeAsset === 'USDT') MinimumOrder = 10;
		if (SecondeAsset === 'BTC') MinimumOrder = 0.0003;

		console.log(Prices, 'Prices', Username, ChatID);

		while (!OverCurrencyQuantity) {
			// console.log(
			// 	SpotSymbolData[Currency].QuantityPrecision,
			// 	'SpotSymbolData[Currency].QuantityPrecision',
			// 	Username
			// );
			TargetsQuantity = this.ToFixed(
				Quantity / (Prices.length - TargetCount),
				SpotSymbolData[Currency].QuantityPrecision
			);
			if (StopLoss * TargetsQuantity >= MinimumOrder) OverCurrencyQuantity = true;
			else TargetCount++;
		}
		var NewTargetsQuantity = this.ToFixed(TargetsQuantity, SpotSymbolData[Currency].QuantityPrecision);

		// var NewTargetsQuantity = TargetsQuantity;

		console.log(TargetCount, ' --TargetCount-- ', Username);

		console.log('---Prices before splice ', Username, Prices);
		if (TargetCount) Prices.splice(-Math.abs(TargetCount));
		console.log('---Prices after splice ', Username, Prices);

		var RemainingQuantity = this.ToFixed(
			(TargetsQuantity - NewTargetsQuantity) * Prices.length,
			SpotSymbolData[Currency].QuantityPrecision
		);

		var OtherRemainingQuantity = NewTargetsQuantity * Prices.length;

		// console.log(NewTargetsQuantity, 'NewTargetsQuantityHere', Username, ChatID);
		// console.log(Prices.length, 'Prices.length', Username, ChatID);

		if (OtherRemainingQuantity < Quantity)
			OtherRemainingQuantity = this.ToFixed(
				Quantity - OtherRemainingQuantity,
				SpotSymbolData[Currency].QuantityPrecision
			);
		else OtherRemainingQuantity = 0;

		// console.log(OtherRemainingQuantity, 'OtherRemainingQuantity');
		// if (typeof RemainingQuantity === 'string') RemainingQuantity = 0.0;
		// var RemainingQuantity = (TargetsQuantity - NewTargetsQuantity) * Prices.length;

		var TakeProfitItems = [];
		var StopLossItems = [];
		Prices.map(async (Price, PriceIndex) => {
			var LocalQuantity = 0.0;
			if (!PriceIndex)
				LocalQuantity =
					parseFloat(NewTargetsQuantity) + parseFloat(RemainingQuantity) + parseFloat(OtherRemainingQuantity);
			else LocalQuantity = NewTargetsQuantity;

			console.log(LocalQuantity, 'LocalQuantityHere');

			var LastStatus = false;
			if (PriceIndex + 1 === Prices.length) LastStatus = true;
			let OrderStatus = await this.OrderOCO(Currency, LocalQuantity, Price, StopLoss, BinanceConnection);

			console.log(OrderStatus, Username, 'OrderStatusSpot', ChatID);

			let SLOrderID = OrderStatus.orderReports.filter((SLItem) => {
				if (SLItem.type === 'STOP_LOSS_LIMIT') return SLItem;
			});

			var StopLossOrderID = SLOrderID[0].orderId;
			if (typeof StopLossOrderID === 'object') StopLossOrderID = StopLossOrderID.toString();
			StopLossItems.push(StopLossOrderID);

			let TPOrderID = OrderStatus.orderReports.filter((TPItem) => {
				if (TPItem.type === 'LIMIT_MAKER') return TPItem;
			});

			var TakeProfitOrderID = TPOrderID[0].orderId;
			if (typeof TakeProfitOrderID === 'object') TakeProfitOrderID = TakeProfitOrderID.toString();
			TakeProfitItems.push(TakeProfitOrderID);

			// Add order to user
			await User.UpdateUserSignal(Username, ChatID, {
				$push: {
					'Signals.$.DoneTargets': {
						OrderListID: OrderStatus.orderListId,
						TargetCreationDate: new Date(Date.now()),
						SLOrderID: StopLossOrderID,
						TPOrderID: TakeProfitOrderID,
						OrderQuantity: LocalQuantity,
						Price: Price,
						Hit: false,
						Type: 'oco_order'
					}
				}
			});

			if (Prices.length - 1 === PriceIndex) {
				setTimeout(() => {
					global.SpotPositionChecker.AddOrderToMonitorList(
						Currency,
						Username,
						ChatID,
						TakeProfitItems,
						StopLossItems,
						'oco_order'
					);
				}, 20000);
			}
		});

		return true;
	}

	AddTPCandle(Currency, Quantity, Prices, ChatID, SecondeAsset, BinanceConnection, Username) {
		console.log('Add tp candle!');
		console.log(Currency, Quantity, Prices, ChatID, SecondeAsset, Username);

		var TargetCount = 0;
		var OverCurrencyQuantity = false;
		var TargetsQuantity = 0.0;

		var MinimumOrder;
		if (SecondeAsset === 'USDT') MinimumOrder = 10;
		if (SecondeAsset === 'BTC') MinimumOrder = 0.0001;

		while (!OverCurrencyQuantity) {
			console.log(
				SpotSymbolData[Currency].QuantityPrecision,
				'SpotSymbolData[Currency].QuantityPrecision',
				Username
			);

			TargetsQuantity = this.ToFixed(
				Quantity / (Prices.length - TargetCount),
				SpotSymbolData[Currency].QuantityPrecision
			);

			// OverCurrencyQuantity = true;

			let PricesStatus = Prices.map((Price) => {
				if (Price * TargetsQuantity >= MinimumOrder) return true;

				return false;
			});

			console.log(PricesStatus);

			if (PricesStatus.indexOf(false)) OverCurrencyQuantity = true;
			else TargetCount++;
		}

		console.log(TargetCount, ' --TargetCount-- ', Username);

		var NewTargetsQuantity = this.ToFixed(TargetsQuantity, SpotSymbolData[Currency].QuantityPrecision);

		console.log('--Prices before sort ', Username, Prices);

		Prices.sort(function(a, b) {
			return a - b;
		});

		console.log('--Prices after sort ', Username, Prices);

		console.log('---Prices before splice ', Username, Prices);

		if (TargetCount) Prices.splice(-Math.abs(TargetCount));

		console.log('---Prices before splice ', Username, Prices);

		var RemainingQuantity = this.ToFixed(
			(TargetsQuantity - NewTargetsQuantity) * Prices.length,
			SpotSymbolData[Currency].QuantityPrecision
		);

		console.log(RemainingQuantity, 'RemainingQuantity FuckYou');
		console.log(Prices, 'Prices', Username, ChatID);

		var OtherRemainingQuantity = NewTargetsQuantity * Prices.length;

		if (OtherRemainingQuantity < Quantity)
			OtherRemainingQuantity = this.ToFixed(
				Quantity - OtherRemainingQuantity,
				SpotSymbolData[Currency].QuantityPrecision
			);

		var TakeProfitItems = [];
		var StopLossItems = [];

		Prices.map(async (Price, PriceIndex) => {
			var LocalQuantity = 0.0;

			console.log(RemainingQuantity, 'RemainingQuantity');

			if (!PriceIndex)
				LocalQuantity =
					parseFloat(NewTargetsQuantity) + parseFloat(RemainingQuantity) + parseFloat(OtherRemainingQuantity);
			else LocalQuantity = NewTargetsQuantity;

			var LocalQuantity = this.ToFixed(LocalQuantity, SpotSymbolData[Currency].QuantityPrecision);

			console.log(LocalQuantity, 'LocalQuantityHere');

			var LastStatus = false;

			if (PriceIndex + 1 === Prices.length) LastStatus = true;

			let OrderStatus = await this.Order(Currency, LocalQuantity, Price, BinanceConnection);

			console.log(OrderStatus, 'OrderStatus', Username, ChatID);

			var TakeProfitOrderID = OrderStatus.orderId;
			if (typeof TakeProfitOrderID === 'object') TakeProfitOrderID = TakeProfitOrderID.toString();

			TakeProfitItems.push(TakeProfitOrderID);

			// Add order to user
			await User.UpdateUserSignal(Username, ChatID, {
				$push: {
					'Signals.$.DoneTargets': {
						OrderID: TakeProfitOrderID,
						TargetCreationDate: new Date(Date.now()),
						Price: Price,
						OrderQuantity: LocalQuantity,
						Hit: false,
						Type: 'take_profit'
					}
				}
			});

			if (Prices.length - 1 === PriceIndex) {
				setTimeout(() => {
					global.SpotPositionChecker.AddOrderToMonitorList(
						Currency,
						Username,
						ChatID,
						TakeProfitItems,
						StopLossItems,
						'manual'
					);
				}, 20000);
			}
			// Add target orderId to the database
			// await SignalUpdate.SignalUpdate(ChatID, {
			//     $push: {
			//         DoneTargets: {
			//             OrderID: OrderStatus.orderId,
			//             Price: Price,
			//             OrderQuantity: LocalQuantity,
			//             Hit: false,
			//             Type: 'take_profit'
			//         }
			//     }
			// });
		});
	}

	async AddSL(Currency, Quantity, Price, ChatID) {
		let OrderStatus = await this.Order(Currency, Quantity, Price, 'STOP_LOSS_LIMIT');

		// console.log(OrderStatus, 'OrderStatus ADDSL', ChatID);

		// Add target orderId to the database
		await SignalUpdate.SignalUpdate(ChatID, {
			$push: {
				DoneTargets: {
					OrderID: OrderStatus.orderId.toString(),
					TargetCreationDate: new Date(Date.now()),
					Price: Price,
					Hit: false,
					Type: 'stoploss'
				}
			}
		});
	}

	CheckAPIReturn(APIReturn) {
		if (typeof APIReturn === 'string') APIReturn = JSON.parse(APIReturn);

		if (APIReturn.orderId) return true;

		return false;
	}

	async CancelOrder(Currency, OrderID, BinanceConnection) {
		return new Promise((Resolve, Reject) => {
			BinanceConnection.cancel(Currency, OrderID, (Error, Response, Symbol) => {
				if (Error) {
					Reject(Error);
				}

				Resolve(Response);
			});
		});
	}

	async CancelMarketSignal(Currency, Quantity, BinanceConnection) {
		try {
			const OrderStatus = await BinanceConnection.marketSell(Currency, this.ScientificToDecimal(Quantity));

			return true;
		} catch (ReturnError) {
			return false;
		}
	}

	async CandleStopLossSignal(ChatID) {
		// Update main signals

		// Select all user of signal
		var AllUsers = await DatabaseQuery.AsyncMakeDatabaseQuery({
			DBQueryMethod: 'Select',
			MethodData: {
				ModelName: 'exb-users',
				SelectKeys: 'Username ExchangesData Signals',
				SelectOptions: {},
				Where: {
					$or: [ { 'TradeSpan.Binance.SpotUSDT': true }, { 'TradeSpan.Binance.SpotBTC': true } ]
				}
			}
		});

		AllUsers[1].map((UserItem) => {
			UserItem.Signals.map(async (UserSignal) => {
				if (
					UserSignal.SignalChatID === ChatID &&
					UserSignal.PositionStatus.match(/(?:^|W)(open|target-(.*))(?:$|W)/i)
				) {
					var SignalCurrency = `${UserSignal.Currency[0]}${UserSignal.Currency[1]}`;

					// Remove all order from 'OrderListMonitor'
					const OrderUUIDRegex = new RegExp(`${UserItem.Username};${ChatID};(.*)`, 'g');

					// Remove take profit
					var RemoveIndex = global.SpotMonitorList.TakeProfit
						.map((Order, OrderIndex) => {
							if (Order.match(OrderUUIDRegex)) return OrderIndex;
						})
						.filter(function(Element) {
							return Element != null;
						});

					for (var i = RemoveIndex.length - 1; i >= 0; i--)
						global.SpotMonitorList.TakeProfit.splice(RemoveIndex[i], 1);

					var ReturnProxy = await ProxyHandler.BestProxyIP();

					var BinanceConnection = new BinanceAPI().options({
						APIKEY: UserItem.ExchangesData.Binance.APIKey,
						APISECRET: UserItem.ExchangesData.Binance.APISecret,
						verbose: true
						// proxy: ReturnProxy
					});

					UserSignal.DoneTargets.map(async (Target) => {
						if (Target.Hit) return;

						await this.CancelOrder(SignalCurrency, Target.OrderID, BinanceConnection);
					});

					// Market and update database after 1 seconde
					setTimeout(async () => {
						await this.CancelMarketSignal(SignalCurrency, UserSignal.Quantity, BinanceConnection);

						await User.UpdateUserSignal(UserItem.Username, ChatID, {
							$set: {
								'Signals.$.PositionStatus': 'stoploss'
							}
						});
					}, 1000);
				}
			});
		});
	}
}

module.exports = MainBinanceSpot;
