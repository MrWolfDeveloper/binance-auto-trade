const Binance = require('node-binance-api');
const BigNumber = require('bignumber.js');

const DataBaseQuery = require(`${__dirname}/../../../database/database-query.js`).DatabaseQuery;
const SignalUpdate = require(`${__dirname}/../../../analysis/signals-query/signal-update`).SignalUpdate;
const User = require(`${__dirname}/../../../user/user.js`).User;
const ProxyHandler = require(`${__dirname}/../../proxy.js`).ProxyHandler;

const SymbolData = require(`${__dirname}/../../../../../../storage/exchange-data/symbol-data-futures.json`);
class FPC {
	UserWebsocket = {};
	CheckingOrderUUIDs = [];
	UsersActiveWebsocket = [];
	// SignalMonitorList = {};

	ScientificToDecimal(num) {
		var nsign = Math.sign(num);
		//remove the sign
		num = Math.abs(num);
		//if the number is in scientific notation remove it
		if (/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
			var zero = '0',
				parts = String(num).toLowerCase().split('e'), //split into coeff and exponent
				e = parts.pop(), //store the exponential part
				l = Math.abs(e), //get the number of zeros
				sign = e / l,
				coeff_array = parts[0].split('.');
			if (sign === -1) {
				l = l - coeff_array[0].length;
				if (l < 0) {
					num =
						coeff_array[0].slice(0, l) +
						'.' +
						coeff_array[0].slice(l) +
						(coeff_array.length === 2 ? coeff_array[1] : '');
				} else {
					num = zero + '.' + new Array(l + 1).join(zero) + coeff_array.join('');
				}
			} else {
				var dec = coeff_array[1];
				if (dec) l = l - dec.length;
				if (l < 0) {
					num = coeff_array[0] + dec.slice(0, l) + '.' + dec.slice(l);
				} else {
					num = coeff_array.join('') + new Array(l + 1).join(zero);
				}
			}
		}

		return nsign < 0 ? '-' + num : num;
	}

	ToFixed(Number, Fixed) {
		// console.log(Number, Fixed);
		// var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
		// return Number.toString().match(Regex)[0];

		return parseFloat(Number).toFixed(Fixed);
	}

	/* ----------------------- Update main signal (Start) ----------------------- */
	async UpdateMainSignal(ChatID, Status, NewData) {
		if (Status === 'stoploss') {
			console.log(await this.MainSignalUpdated(ChatID, 'stoploss'), 'this.MainSignalUpdated');
			// Check main signal need updated?
			if (await this.MainSignalUpdated(ChatID, 'stoploss')) return;

			const { StoplossHitDate } = NewData;

			console.log(
				await SignalUpdate.SignalUpdate(ChatID, {
					$set: {
						PositionStatus: 'stoploss',
						StopLossHitDate: StoplossHitDate
					}
				}),
				'SignalUpdate.SignalUpdate'
			);
		} else {
			// Check main signal need updated?
			if (await this.MainSignalUpdated(ChatID, `target-${TargetIndex + 1}`)) return;

			const { TargetIndex, TargetNumber, TargetHitDate } = NewData;

			// Get all target of signal
			var Signal = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys: 'Targets',
					SelectOptions: {},
					Where: {
						ChatID: ChatID
					}
				}
			});

			// Empty targets to insert new targets
			await SignalUpdate.SignalUpdate(ChatID, {
				$set: {
					Targets: []
				}
			});

			// Insert new signals
			Signal[1][0].Targets.map((Target) => {
				var THD;

				if (Target.toString() === TargetNumber.toString()) THD = TargetHitDate;
				else THD = 'not-set';

				SignalUpdate.SignalUpdate(ChatID, {
					$push: {
						Targets: {
							Target: Target.toString(),
							HitDate: THD
						}
					}
				});
			});

			// Update signal status
			SignalUpdate.SignalUpdate(ChatID, {
				$set: {
					PositionStatus: `target-${TargetIndex + 1}`
				}
			});
		}
	}

	async MainSignalUpdated(ChatID, LastPositionStatus) {
		try {
			var SignalStatus = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys: 'PositionStatus',
					SelectOptions: {},
					Where: {
						ChatID: ChatID
					}
				}
			});

			if (LastPositionStatus === SignalStatus[1][0].PositionStatus) return true;

			return false;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}

	async FindTargetData(Username, ChatID, OrderID) {
		try {
			var UserSignals = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'Signals',
					SelectOptions: {},
					Where: {
						Username: Username,
						'Signals.SignalChatID': ChatID
					}
				}
			});

			// Find signal
			var SelectedSignal = UserSignals[1][0].Signals.filter((Signal) => Signal.SignalChatID === ChatID);
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}
	/* ------------------------ Update main signal (End) ------------------------ */

	async StopLossHited(OrderUUID, Username) {
		const { 0: Currency, 1: ChatID, 2: OrderID, 3: OrderType } = OrderUUID.split(';');
		console.log('Stoploss hited for ' + Username);

		await this.UpdateMainSignal(ChatID, 'stoploss', { StoplossHitDate: new Date() });

		// const UserSignal = await User.GetUserSignal(Username, ChatID, 'Signals');

		// const SignalCurrency = `${UserSignal.Currency[0]}${UserSignal.Currency[1]}`;

		// if (OrderType === 'oco_order') {
		// Update signal
		await User.UpdateUserSignal(Username, ChatID, {
			$set: {
				'Signals.$.PositionStatus': 'stoploss'
			}
		});

		// Update stoploss hit date

		// Remove all order from 'OrderListMonitor'
		const OrderUUIDRegex = new RegExp(`${Currency};${ChatID};(.*)`, 'g');

		// Remove take profit
		var RemoveIndex = global.FuturesMonitorList[Username].TakeProfit
			.map((Order, OrderIndex) => {
				if (Order.match(OrderUUIDRegex)) return OrderIndex;
			})
			.filter(function(Element) {
				return Element != null;
			});

		for (var i = RemoveIndex.length - 1; i >= 0; i--) {
			// Find tp order id
			var OrderUUIDArray = global.FuturesMonitorList[Username].TakeProfit[RemoveIndex[i]].split(';');
			// this.CancelOrder(Currency, OrderUUIDArray[2]);

			global.FuturesMonitorList[Username].TakeProfit.splice(RemoveIndex[i], 1);
		}

		// Remove stoploss
		var RemoveIndex = global.FuturesMonitorList[Username].StopLoss
			.map((Order, OrderIndex) => {
				if (Order.match(OrderUUIDRegex)) return OrderIndex;
			})
			.filter(function(Element) {
				return Element != null;
			});

		for (var i = RemoveIndex.length - 1; i >= 0; i--)
			global.FuturesMonitorList[Username].StopLoss.splice(RemoveIndex[i], 1);
		// }
	}

	async TakeProfitHited(OrderUUID, Username, BinanceConnection) {
		// Is this order already being checked?
		if (this.CheckingOrderUUIDs.indexOf(`${Username};${OrderUUID}`) > -1) return;
		else this.CheckingOrderUUIDs.push(`${Username};${OrderUUID}`);

		const { 0: Currency, 1: ChatID, 2: OrderID, 3: OrderType } = OrderUUID.split(';');

		var UserSignal = await User.GetUserSignal(Username, ChatID, 'Signals');

		const SignalCurrency = `${UserSignal.Currency[0]}${UserSignal.Currency[1]}`;

		// console.log(UserSignal.DoneTargets, 'DoneTargets');

		// Remove stoploss from done targets
		var StopLossIndex = UserSignal.DoneTargets.findIndex((DT) => DT.Type === 'stoploss');

		var StopLossObject = UserSignal.DoneTargets[StopLossIndex];

		var DoneTargets;
		if (StopLossIndex > -1) DoneTargets = UserSignal.DoneTargets.splice(StopLossIndex, 1);
		else DoneTargets = UserSignal.DoneTargets;

		// console.log(DoneTargets, 'ChangedDoneTargest');

		// Sort done targets
		if (UserSignal.ExchangeType[1] === 'long')
			DoneTargets = UserSignal.DoneTargets.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
		else if (UserSignal.ExchangeType[1] === 'short')
			DoneTargets = UserSignal.DoneTargets.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));

		// Which target hited
		var HitedIndex = DoneTargets.findIndex((DT) => OrderID.toString() === DT.OrderID.toString());

		console.log(HitedIndex, 'HitedIndex');

		const OrderUUIDRegex = new RegExp(`${Currency};${ChatID};(.*)`, 'g');

		// Remove hited take profit order from 'OrderListMonitor'
		const OrderUUIDRegexTP = new RegExp(`${Currency};${ChatID};${OrderID};(.*)`, 'g');

		// Remove take profit
		var RemoveIndexTP = global.FuturesMonitorList[Username].TakeProfit
			.map((Order, OrderIndex) => {
				if (Order.match(OrderUUIDRegexTP)) return OrderIndex;
			})
			.filter(function(Element) {
				return Element != null;
			});

		global.FuturesMonitorList[Username].TakeProfit.splice(RemoveIndexTP[0], 1);

		// for (var i = RemoveIndex.length - 1; i >= 0; i--)
		// 	global.FuturesMonitorList[Username].TakeProfit.splice(RemoveIndex[i], 1);

		// Remove stoploss (un comment)
		// if (HitedIndex >= 1) {
		var RemoveIndex = global.FuturesMonitorList[Username].StopLoss
			.map((Order, OrderIndex) => {
				if (Order.match(OrderUUIDRegex)) return OrderIndex;
			})
			.filter(function(Element) {
				return Element != null;
			});

		const StopLossMonitorListIndex = RemoveIndex;

		console.log(RemoveIndex, 'RemoveIndex');

		// for (var i = RemoveIndex.length - 1; i >= 0; i--) {
		// Cancel stoploss
		var OrderUUIDArray = global.FuturesMonitorList[Username].StopLoss[RemoveIndex[0]].split(';');
		console.log(OrderUUIDArray, 'OrderUUIDArray');
		console.log(
			await this.CancelOrder(Currency, OrderUUIDArray[2], BinanceConnection),
			'this.CancelOrder(Currency, OrderUUIDArray[2])'
		);

		global.FuturesMonitorList[Username].StopLoss.splice(RemoveIndex[0], 1);

		console.log(global.FuturesMonitorList, 'global.FuturesMonitorList');
		// }
		// }

		// console.log(global.FuturesMonitorList[Username], 'global.FuturesMonitorList[Username]');

		var SignalStatus;
		if (HitedIndex === DoneTargets.length - 1) {
			console.log('Change status to take_profit', Currency, Username);

			DoneTargets[HitedIndex].Hit = true;
			DoneTargets[HitedIndex].HitDate = new Date(Date.now());

			await User.UpdateUserSignal(Username, ChatID, {
				$set: {
					'Signals.$.DoneTargets': []
				}
			});

			DoneTargets.map(async (NewTarget) => {
				var DN = {
					OrderID: NewTarget.OrderID,
					OrderQuantity: NewTarget.OrderQuantity,
					TargetCreationDate: NewTarget.TargetCreationDate,
					Price: NewTarget.Price,
					Hit: NewTarget.Hit,
					Type: NewTarget.Type
				};

				if (NewTarget.HitDate) DN.HitDate = NewTarget.HitDate;

				await User.UpdateUserSignal(Username, ChatID, {
					$push: {
						'Signals.$.DoneTargets': DN
					}
				});
			});

			SignalStatus = 'take_profit';

			await User.UpdateUserSignal(Username, ChatID, {
				$set: {
					'Signals.$.Quantity': 0,
					PositionStatus: `take_profit`
				}
			});
		} else {
			const UserInfo = await User.GetUserInfo(Username, 'ExchangesData');

			var ReturnProxy = await ProxyHandler.BestProxyIP();

			var BinanceConnection = new Binance().options({
				APIKEY: UserInfo[0].ExchangesData.Binance.APIKey,
				APISECRET: UserInfo[0].ExchangesData.Binance.APISecret,
				verbose: true,
				hedgeMode: true,
				proxy: ReturnProxy
			});

			SignalStatus = `target-${HitedIndex + 1}`;

			DoneTargets[HitedIndex].Hit = true;
			DoneTargets[HitedIndex].HitDate = new Date(Date.now());

			// Update signal
			var NewQuantity = parseFloat(UserSignal.Quantity) - parseFloat(DoneTargets[HitedIndex].OrderQuantity);

			// console.log(NewQuantity, 'NewQuantity');

			await User.UpdateUserSignal(Username, ChatID, {
				$set: {
					'Signals.$.DoneTargets': []
				}
			});

			await User.UpdateUserSignal(Username, ChatID, {
				$set: {
					'Signals.$.Quantity': NewQuantity,
					PositionStatus: SignalStatus
				}
			});

			// if (HitedIndex >= 1) {
			var StopLoss;
			if (!HitedIndex) {
				StopLoss = StopLossObject.Price;
			} else if (HitedIndex === 1) {
				StopLoss = UserSignal.EntryPrice;
			} else if (HitedIndex > 1) {
				StopLoss = UserSignal.DoneTargets[HitedIndex - 2].Price;
			}

			// Add new stoploss
			const NewStoploss = await this.AddNewSL(
				UserSignal.ExchangeType[1],
				SignalCurrency,
				UserSignal.Quantity,
				StopLoss,
				BinanceConnection,
				Username
			);

			var StopLossOrderID = NewStoploss.orderId;
			if (typeof StopLossOrderID === 'object') StopLossOrderID = StopLossOrderID.toString();

			console.log(NewStoploss, 'NewStoploss');

			console.log(StopLoss, 'StopLoss');

			setTimeout(() => {
				// Add to monitor list
				global.FuturesMonitorList[Username].StopLoss = [
					...global.FuturesMonitorList[Username].StopLoss,
					`${SignalCurrency};${ChatID};${StopLossOrderID.toString()};normal`
				];
			}, 20000);

			// Update stoploss target creation
			await User.UpdateUserSignal(Username, ChatID, {
				$push: {
					'Signals.$.DoneTargets': {
						OrderID: StopLossOrderID,
						OrderQuantity: UserSignal.Quantity,
						TargetCreationDate: new Date(Date.now()),
						Price: StopLoss,
						Hit: false,
						Type: 'stoploss'
					}
				}
			});
			// }

			setTimeout(async () => {
				DoneTargets.map(async (NewTarget) => {
					// if (HitedIndex > 0) {
					// console.log(NewTarget, 'NewTarget', 'HitedIndex > 0');
					// 	if (NewTarget.Type === 'take_profit') {
					// 		await User.UpdateUserSignal(Username, ChatID, {
					// 			$push: {
					// 				'Signals.$.DoneTargets': {
					// 					OrderID: NewTarget.OrderID,
					// 					OrderQuantity: NewTarget.OrderQuantity,
					// 					TargetCreationDate: NewTarget.TargetCreationDate,
					// 					Price: NewTarget.Price,
					// 					Hit: NewTarget.Hit,
					// 					Type: 'take_profit'
					// 				}
					// 			}
					// 		});
					// 	}
					// } else {
					// console.log(NewTarget, 'NewTarget', 'else');
					var DN = {
						OrderID: NewTarget.OrderID,
						OrderQuantity: NewTarget.OrderQuantity,
						TargetCreationDate: NewTarget.TargetCreationDate,
						Price: NewTarget.Price,
						Hit: NewTarget.Hit,
						Type: NewTarget.Type
					};

					if (NewTarget.HitDate) DN.HitDate = NewTarget.HitDate;

					await User.UpdateUserSignal(Username, ChatID, {
						$push: {
							'Signals.$.DoneTargets': DN
						}
					});
					// }
				});
			}, 2000);
		}

		// console.log(SignalStatus);

		// Update signal status
		await User.UpdateUserSignal(Username, ChatID, {
			$set: {
				'Signals.$.PositionStatus': SignalStatus
			}
		});
	}

	async AddNewSL(PositionType, Currency, Quantity, StopPrice, BinanceConnection, Username) {
		console.log('Add new stoploss', Username);
		var OrderType = '';
		var Options = {};

		var NewQuantity = this.ToFixed(Quantity, SymbolData[Currency].QuantityPrecision);

		// console.log(NewQuantity, 'ToFixedNewQuantity');

		// console.log(StopPrice, 'StopPrice');

		var StopPriceNumber;
		if (typeof StopPrice === 'object') StopPriceNumber = StopPrice.Target;
		else StopPriceNumber = StopPrice;

		// console.log(StopPriceNumber, 'StopPriceNumber');

		if (PositionType === 'long') {
			OrderType = 'futuresSell';
			Options = {
				positionSide: 'LONG',
				quantity: 0,
				side: 'SELL',
				closePosition: true,
				placeType: 'position',
				timeInForce: 'GTC',
				type: 'STOP_MARKET',
				stopPrice: this.ScientificToDecimal(this.ToFixed(StopPriceNumber, SymbolData[Currency].PricePrecision)),
				workingType: 'MARK_PRICE'
			};
		} else if (PositionType === 'short') {
			OrderType = 'futuresBuy';
			Options = {
				positionSide: 'SHORT',
				quantity: 0,
				side: 'BUY',
				closePosition: true,
				placeType: 'position',
				timeInForce: 'GTC',
				type: 'STOP_MARKET',
				stopPrice: this.ScientificToDecimal(this.ToFixed(StopPriceNumber, SymbolData[Currency].PricePrecision)),
				workingType: 'MARK_PRICE'
			};
		}

		console.log(OrderType, Options, 'OrderType, Options');

		var OrderStatus = await BinanceConnection[OrderType](Currency, 0, 0, Options);

		return OrderStatus;
	}

	async RunFuturesChecker() {
		// Get all futures users
		const AllFuturesUsers = await this.ReadyOrders();

		// Ready all orders
		AllFuturesUsers.map((User, UserIndex) => {
			User.Signals.map((Signal) => {
				var SignalCurrency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

				var DoneTargets;

				// Sort done targets
				if (Signal.ExchangeType[1] === 'long')
					DoneTargets = Signal.DoneTargets.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
				else if (Signal.ExchangeType[1] === 'short')
					DoneTargets = Signal.DoneTargets.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));

				var TakeProfits = [];
				var StopLoss = [];

				// here
				for (var i = 0; i < DoneTargets.length; i++) {
					if (DoneTargets[i].Type === 'take_profit') {
						if (typeof DoneTargets[i].Hit === 'undefined' || !DoneTargets[i].Hit)
							TakeProfits.push(DoneTargets[i].OrderID);
					} else if (DoneTargets[i].Type === 'stoploss') {
						if (typeof DoneTargets[i].Hit === 'undefined' || !DoneTargets[i].Hit)
							StopLoss.push(DoneTargets[i].OrderID);
					}
				}

				this.AddOrderToMonitorList(
					User.Username,
					Signal.SignalChatID,
					TakeProfits,
					StopLoss,
					SignalCurrency,
					UserIndex
				);

				// Add websocket for user data stream
				if (this.UsersActiveWebsocket.indexOf(User.Username) === -1) {
					this.UsersActiveWebsocket.push(User.Username);

					this.AddUserDataStream(User.Username, User.APIKey, User.APISecret, UserIndex);
				}
			});
		});
	}

	FakeUserDataStream(Username, OrderIDs) {
		console.log(OrderIDs, 'OrderIDs');

		OrderIDs.map((OrderID, OrderIDIndex) => {
			OrderID = OrderID.split(';')[2];
			setTimeout(() => {
				// var { s: Currency, X: OrderStatus, i: OrderID, o: OrderType, q: Quantity } = Data.o;

				// if (OrderStatus != 'FILLED') return;

				console.log(OrderID, 'OrderID');

				var TakeProfitHitedIndex = global.FuturesMonitorList[Username].TakeProfit.findIndex(
					(TP) => OrderID.toString() === TP.split(';')[2]
				);

				console.log(TakeProfitHitedIndex, 'TakeProfitHitedIndex');

				if (TakeProfitHitedIndex > -1)
					return this.TakeProfitHited(
						global.FuturesMonitorList[Username].TakeProfit[TakeProfitHitedIndex],
						Username
					);

				// var StopLossHitedIndex = global.FuturesMonitorList[Username].StopLoss.findIndex(
				// 	(SL) => OrderID.toString() === SL.split(';')[2]
				// );

				// if (StopLossHitedIndex > -1)
				// 	return this.StopLossHited(
				// 		global.FuturesMonitorList[Username].StopLoss[StopLossHitedIndex],
				// 		Username
				// 	);
			}, 7000 * OrderIDIndex);
		});
	}

	async AddUserDataStream(Username, APIKey, APISecret, UserIndex) {
		console.log('-> Adding AddUserDataStream', Username);

		setTimeout(async () => {
			var BinanceConnection = new Binance().options({ APIKEY: APIKey, APISECRET: APISecret, verbose: true });
			var ListenKey = await BinanceConnection.futuresGetDataStream();

			this.UserWebsocket[Username] = {
				ListenKey: ListenKey,
				BinanceConnection: BinanceConnection
			};

			var Self = this;

			// Save websocket
			this.UserWebsocket[Username].Websocket = this.UserWebsocket[
				Username
			].BinanceConnection.futuresSubscribeSingle(ListenKey.listenKey, (Data) => {
				var { e: Event } = Data;

				// console.log(Data, 'Data');

				if (Event === 'ORDER_TRADE_UPDATE') {
					var { s: Currency, X: OrderStatus, i: OrderID, o: OrderType, q: Quantity } = Data.o;

					if (OrderStatus != 'FILLED') return;

					console.log(Data.o.i, Username, 'OrderID, Username');

					var TakeProfitHitedIndex = global.FuturesMonitorList[Username].TakeProfit.findIndex(
						(TP) => OrderID.toString() === TP.split(';')[2]
					);

					if (TakeProfitHitedIndex > -1) {
						console.log('---TakeProfit Hited', Username);
						return this.TakeProfitHited(
							global.FuturesMonitorList[Username].TakeProfit[TakeProfitHitedIndex],
							Username,
							BinanceConnection
						);
					}

					var StopLossHitedIndex = global.FuturesMonitorList[Username].StopLoss.findIndex(
						(SL) => OrderID.toString() === SL.split(';')[2]
					);

					if (StopLossHitedIndex > -1) {
						console.log('---Stoploss Hited', Username);
						return this.StopLossHited(
							global.FuturesMonitorList[Username].StopLoss[StopLossHitedIndex],
							Username
						);
					}
				}
			});

			this.RenewDataStream(Username, APIKey, APISecret, BinanceConnection);
		}, 400 * UserIndex);
	}

	TerminateWebsocket(Username) {
		this.UserWebsocket[Username].Websocket.terminate();
	}

	async RenewDataStream(Username, APIKey, APISecret, BinanceConnection) {
		var Self = this;

		// Keep listen key alive every 30 minutes
		Self.UserWebsocket[Username].ListenKeyInterval = setInterval(async () => {
			await Self.UserWebsocket[Username].BinanceConnection.futuresKeepDataStream();
		}, 1800000);

		setInterval(async () => {
			await this.TerminateWebsocket(Username);

			// Save websocket
			Self.UserWebsocket[Username].Websocket = Self.UserWebsocket[
				Username
			].BinanceConnection.futuresSubscribeSingle(this.UserWebsocket[Username].ListenKey.listenKey, (Data) => {
				var { e: Event } = Data;

				// console.log(Data);

				if (Event === 'ORDER_TRADE_UPDATE') {
					var { s: Currency, X: OrderStatus, i: OrderID, o: OrderType, q: Quantity } = Data.o;

					if (OrderStatus != 'FILLED') return;

					// console.log(Data.o.i, Username, 'OrderID, Username');

					var TakeProfitHitedIndex = global.FuturesMonitorList[Username].TakeProfit.findIndex(
						(TP) => OrderID.toString() === TP.split(';')[2]
					);

					if (TakeProfitHitedIndex > -1) {
						console.log('---TakeProfit Hited', Username);
						return Self.TakeProfitHited(
							global.FuturesMonitorList[Username].TakeProfit[TakeProfitHitedIndex],
							Username,
							BinanceConnection
						);
					}

					var StopLossHitedIndex = global.FuturesMonitorList[Username].StopLoss.findIndex(
						(SL) => OrderID.toString() === SL.split(';')[2]
					);

					if (StopLossHitedIndex > -1) {
						console.log('---Stoploss Hited', Username);
						return Self.StopLossHited(
							global.FuturesMonitorList[Username].StopLoss[StopLossHitedIndex],
							Username
						);
					}
				}
			});
		}, 1000000);
	}

	async AddOrderToMonitorList(Username, ChatID, TakeProfits, StopLoss, SignalCurrency, UserIndex) {
		console.log('Call Monitor List');
		console.log(Username, 'Username', TakeProfits, StopLoss);

		// Ready take profits
		var NewTP = TakeProfits.map((OrderID) => {
			var OrderUUIDGen = `${SignalCurrency};${ChatID};${OrderID};normal`;

			if (typeof global.FuturesMonitorList[Username] === 'undefined') return OrderUUIDGen;
			if (global.FuturesMonitorList[Username].TakeProfit.indexOf(OrderUUIDGen) > -1) return null;
			else return OrderUUIDGen;
		});

		NewTP = NewTP.filter(function(Element) {
			return Element != null;
		});

		// Ready stoploss
		var NewSL = StopLoss.map((OrderID) => {
			var OrderUUIDGen = `${SignalCurrency};${ChatID};${OrderID};normal`;

			if (typeof global.FuturesMonitorList[Username] === 'undefined') return OrderUUIDGen;
			if (global.FuturesMonitorList[Username].StopLoss.indexOf(OrderUUIDGen) > -1) return null;
			else return OrderUUIDGen;
		});

		NewSL = NewSL.filter(function(Element) {
			return Element != null;
		});

		// Add new user for monitor
		if (typeof global.FuturesMonitorList[Username] === 'undefined')
			global.FuturesMonitorList[Username] = { TakeProfit: [], StopLoss: [] };

		// Add to list
		global.FuturesMonitorList[Username].TakeProfit = [
			...global.FuturesMonitorList[Username].TakeProfit,
			...NewTP
		];
		global.FuturesMonitorList[Username].StopLoss = [ ...global.FuturesMonitorList[Username].StopLoss, ...NewSL ];

		// Add websocket for user data stream
		if (this.UsersActiveWebsocket.indexOf(Username) === -1) {
			this.UsersActiveWebsocket.push(Username);

			try {
				var AllUsers = await DataBaseQuery.AsyncMakeDatabaseQuery({
					DBQueryMethod: 'Select',
					MethodData: {
						ModelName: 'exb-users',
						SelectKeys: 'Username Signals ExchangesData',
						SelectOptions: {},
						Where: {
							Username: Username
						}
					}
				});

				// this.FakeUserDataStream(Username, NewTP);

				this.AddUserDataStream(
					Username,
					AllUsers[1][0].ExchangesData.Binance.APIKey,
					AllUsers[1][0].ExchangesData.Binance.APISecret,
					UserIndex
				);
			} catch (ReturnError) {}
		}
	}

	async ReadyOrders() {
		try {
			var AllUsers = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'Username Signals ExchangesData',
					SelectOptions: {},
					Where: {
						$or: [ { 'TradeSpan.Binance.Futures': true } ]
					}
				}
			});

			var NewUsers = AllUsers[1].map((UserData) => {
				let { Username, Signals, ExchangesData } = UserData;

				var FilterSignal = Signals.filter((Signal) => {
					if (
						Signal.ExchangeType[0] === 'binance-futures' &&
						/(?:^|W)(open|target-(.*))(?:$|W)/i.test(Signal.PositionStatus)
					)
						return Signal;
				});

				return {
					Username: Username,
					Signals: FilterSignal,
					APIKey: ExchangesData.Binance.APIKey,
					APISecret: ExchangesData.Binance.APISecret
				};
			});

			return NewUsers;
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	}

	async CancelOrder(Currency, OrderID, BinanceConnection) {
		return await BinanceConnection.futuresCancel(Currency, { orderId: OrderID });
	}

	CloseWebsocket(Username) {}
}

module.exports = FPC;
