const Binance = require('node-binance-api');

const DataBaseQuery =
    require(`${__dirname}/../../../database/database-query.js`).DatabaseQuery;
const SignalUpdate =
    require(`${__dirname}/../../../analysis/signals-query/signal-update`).SignalUpdate;
const User = require(`${__dirname}/../../../user/user.js`).User;
const ProxyHandler = require(`${__dirname}/../../proxy.js`).ProxyHandler;

const SpotSymbolData = require(`${__dirname}/../../../../../../storage/exchange-data/symbol-data-spot.json`);

class SpotPositionChecker {
    APIHitStatus;
    CurrencyListMonitor;
    OrderListMonitor;
    LastTradeWSID;
    PendingOrderUUIDList = [];

    constructor() {
        this.APIHitStatus = ['FILLED', 'PARTIALLY_FILLED'];
        this.LastTradeWSID = 0;
        this.CurrencyListMonitor = [];
        global.SpotMonitorList = {
            TakeProfit: [],
            StopLoss: []
        };
    }

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
                    num =
                        zero +
                        '.' +
                        new Array(l + 1).join(zero) +
                        coeff_array.join('');
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

    async StopLossHited(OrderUUID) {
        try {
            const {
                0: Username,
                1: ChatID,
                2: OrderID,
                3: OrderType
            } = OrderUUID.split(';');

            var NewOrderUUID = `${Username}:${ChatID}`;

            // Check OrderUUID is in pending list
            if (this.PendingOrderUUIDList.indexOf(NewOrderUUID) > -1) return;

            // Add to Pending list
            this.PendingOrderUUIDList.push(NewOrderUUID);

            // Remove OrderUUID from pending list after 20 seconds
            setTimeout(() => {
                this.PendingOrderUUIDList = this.PendingOrderUUIDList.filter(
                    function (Item) {
                        return Item !== NewOrderUUID;
                    }
                );

                console.log(this.NewOrderUUID, 'this.PendingOrderUUIDList');
            }, 20000);

            console.log('Stoploss hited', OrderUUID);

            // Update public signal status (Need edit)
            await SignalUpdate.SignalUpdate(ChatID, {
                $set: {
                    PositionStatus: 'stoploss'
                }
            });

            // Select signal
            const UserSignal = await User.GetUserSignal(
                Username,
                ChatID,
                'Signals'
            );

            console.log(UserSignal, 'UserSignal');

            // const SignalCurrency = `${UserSignal.Currency[0]}${UserSignal.Currency[1]}`;

            if (OrderType === 'oco_order') {
                // Update signal
                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.PositionStatus': 'stoploss'
                    }
                });

                // Remove all order from 'OrderListMonitor'
                const OrderUUIDRegex = new RegExp(
                    `${Username};${ChatID};(.*)`,
                    'g'
                );

                // Remove take profit
                var RemoveIndex = global.SpotMonitorList.TakeProfit.map(
                    (Order, OrderIndex) => {
                        if (Order.match(OrderUUIDRegex)) return OrderIndex;
                    }
                ).filter(function (Element) {
                    return Element != null;
                });

                for (var i = RemoveIndex.length - 1; i >= 0; i--)
                    global.SpotMonitorList.TakeProfit.splice(RemoveIndex[i], 1);

                // Remove stoploss
                var RemoveIndex = global.SpotMonitorList.StopLoss.map(
                    (Order, OrderIndex) => {
                        if (Order.match(OrderUUIDRegex)) return OrderIndex;
                    }
                ).filter(function (Element) {
                    return Element != null;
                });

                for (var i = RemoveIndex.length - 1; i >= 0; i--)
                    global.SpotMonitorList.StopLoss.splice(RemoveIndex[i], 1);

                // Sort done targets
                var DoneTargets = UserSignal.DoneTargets.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                );

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.DoneTargets': []
                    }
                });

                // Remove duplicated done targets
                DoneTargets = DoneTargets.filter(
                    (V, I, A) =>
                        A.findIndex(
                            (T) => JSON.stringify(T) === JSON.stringify(V)
                        ) === I
                );

                console.log(DoneTargets.length, 'Length');

                // Insert new done targets with 'TargetHitDate'
                DoneTargets.map(async (DTItem) => {
                    await User.UpdateUserSignal(
                        Username,
                        ChatID,
                        {
                            $push: {
                                'Signals.$.DoneTargets': {
                                    OrderListID: DTItem.OrderListID,
                                    TargetCreationDate:
                                        DTItem.TargetCreationDate,
                                    HitDate: new Date(Date.now()),
                                    SLOrderID: DTItem.SLOrderID,
                                    TPOrderID: DTItem.TPOrderID,
                                    OrderQuantity: DTItem.OrderQuantity,
                                    Price: DTItem.Price,
                                    Hit: DTItem.Hit,
                                    Type: 'oco_order'
                                }
                            }
                        },
                        'StopLossHited'
                    );
                });
            }
        } catch (ReturnError) {
            console.log(ReturnError, 'StopLoss Hited');
        }
    }

    async TakeProfitHited(OrderUUID) {
        // Check OrderUUID is in pending list
        if (this.PendingOrderUUIDList.indexOf(OrderUUID) > -1) return;

        // Add to Pending list
        this.PendingOrderUUIDList.push(OrderUUID);

        // Remove OrderUUID from pending list after 20 seconds
        setTimeout(() => {
            this.PendingOrderUUIDList = this.PendingOrderUUIDList.filter(
                function (Item) {
                    return Item !== OrderUUID;
                }
            );

            console.log(this.PendingOrderUUIDList, 'this.PendingOrderUUIDList');
        }, 20000);

        const {
            0: Username,
            1: ChatID,
            2: OrderID,
            3: OrderType
        } = OrderUUID.split(';');

        const UserSignal = await User.GetUserSignal(
            Username,
            ChatID,
            'Signals'
        );

        const SignalCurrency = `${UserSignal.Currency[0]}${UserSignal.Currency[1]}`;

        if (OrderType === 'oco_order') {
            // Sort done targets
            var DoneTargets = UserSignal.DoneTargets.sort(
                (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
            );

            // Which target hited
            var HitedIndex = DoneTargets.findIndex(
                (DT) => OrderID.toString() === DT.TPOrderID.toString()
            );

            DoneTargets[HitedIndex].Hit = true;
            DoneTargets[HitedIndex].HitDate = new Date(Date.now());

            console.log(HitedIndex, 'HitedIndex');

            if (HitedIndex >= 1) {
                // Remove all order from 'OrderListMonitor'
                const OrderUUIDRegex = new RegExp(
                    `${Username};${ChatID};(.*)`,
                    'g'
                );

                // Remove take profit
                var RemoveIndex = global.SpotMonitorList.TakeProfit.map(
                    (Order, OrderIndex) => {
                        if (Order.match(OrderUUIDRegex)) return OrderIndex;
                    }
                ).filter(function (Element) {
                    return Element != null;
                });

                for (var i = RemoveIndex.length - 1; i >= 0; i--)
                    global.SpotMonitorList.TakeProfit.splice(RemoveIndex[i], 1);

                // Remove stoploss
                var RemoveIndex = global.SpotMonitorList.StopLoss.map(
                    (Order, OrderIndex) => {
                        if (Order.match(OrderUUIDRegex)) return OrderIndex;
                    }
                ).filter(function (Element) {
                    return Element != null;
                });

                for (var i = RemoveIndex.length - 1; i >= 0; i--)
                    global.SpotMonitorList.StopLoss.splice(RemoveIndex[i], 1);
            }

            var SignalStatus;
            if (HitedIndex === DoneTargets.length - 1) {
                SignalStatus = 'take_profit';

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.DoneTargets': []
                    }
                });

                setTimeout(async () => {
                    DoneTargets.map(async (NewTarget) => {
                        var DN = {
                            'Signals.$.DoneTargets': {
                                OrderListID: NewTarget.OrderListID,
                                TargetCreationDate:
                                    NewTarget.TargetCreationDate,
                                HitDate: new Date(Date.now()),
                                SLOrderID: NewTarget.SLOrderID,
                                TPOrderID: NewTarget.TPOrderID,
                                OrderQuantity: NewTarget.OrderQuantity,
                                Price: NewTarget.Price,
                                Hit: NewTarget.Hit,
                                Type: 'oco_order'
                            }
                        };

                        if (NewTarget.Hit) {
                            if (!NewTarget.HitDate)
                                DN.HitDate = new Date(Date.now());
                        }

                        await User.UpdateUserSignal(Username, ChatID, {
                            $push: DN
                        });
                    });
                });
            } else {
                const UserInfo = await User.GetUserInfo(
                    Username,
                    'ExchangesData'
                );

                var ReturnProxy = await ProxyHandler.BestProxyIP();

                var BinanceConnection = new Binance().options({
                    APIKEY: UserInfo[0].ExchangesData.Binance.APIKey,
                    APISECRET: UserInfo[0].ExchangesData.Binance.APISecret,
                    verbose: true,
                    proxy: ReturnProxy
                });

                SignalStatus = `target-${HitedIndex + 1}`;

                var StopLoss;
                if (!HitedIndex) {
                    StopLoss = UserSignal.EntryPrice;
                } else if (HitedIndex === 1) {
                    StopLoss = UserSignal.EntryPrice;
                } else if (HitedIndex > 1) {
                    StopLoss = UserSignal.DoneTargets[HitedIndex - 2].Price;
                }

                // Cancel all oco order
                if (HitedIndex >= 1) {
                    console.log('Canceling all orders!');
                    this.CancelAllOCOOrders(
                        SignalCurrency,
                        UserSignal.DoneTargets,
                        BinanceConnection
                    );
                }

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.DoneTargets': []
                    }
                });

                // DoneTargets[HitedIndex].Hit = true;

                setTimeout(async () => {
                    DoneTargets.map(async (NewTarget) => {
                        if (HitedIndex >= 1) {
                            this.OrderOCO(
                                NewTarget.TargetCreationDate,
                                SignalCurrency,
                                this.ToFixed(
                                    NewTarget.OrderQuantity,
                                    SpotSymbolData[SignalCurrency]
                                        .QuantityPrecision
                                ),
                                NewTarget.Price,
                                StopLoss,
                                ChatID,
                                NewTarget.Hit,
                                NewTarget.HitDate,
                                BinanceConnection,
                                Username
                            ).catch((ReturnError) => {
                                console.error(ReturnError, 'ReturnErrorOCO');
                            });
                        } else {
                            var DN = {
                                'Signals.$.DoneTargets': {
                                    OrderListID: NewTarget.OrderListID,
                                    TargetCreationDate:
                                        NewTarget.TargetCreationDate,
                                    HitDate: new Date(Date.now()),
                                    SLOrderID: NewTarget.SLOrderID,
                                    TPOrderID: NewTarget.TPOrderID,
                                    OrderQuantity: NewTarget.OrderQuantity,
                                    Price: NewTarget.Price,
                                    Hit: NewTarget.Hit,
                                    Type: 'oco_order'
                                }
                            };

                            if (NewTarget.Hit) {
                                if (!NewTarget.HitDate)
                                    DN.HitDate = new Date(Date.now());
                            }

                            await User.UpdateUserSignal(Username, ChatID, {
                                $push: DN
                            });
                        }
                    });
                }, 2000);
            }

            // Update signal
            await User.UpdateUserSignal(Username, ChatID, {
                $set: {
                    'Signals.$.PositionStatus': SignalStatus
                }
            });
        } else {
            // Sort done targets
            var DoneTargets = UserSignal.DoneTargets.sort(
                (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
            );

            // Which target hited
            var HitedIndex = DoneTargets.findIndex(
                (DT) => OrderID.toString() === DT.OrderID.toString()
            );

            var mainQuantity = parseFloat(UserSignal.Quantity);
            mainQuantity =
                mainQuantity -
                parseFloat(DoneTargets[HitedIndex].OrderQuantity);
            mainQuantity = this.ToFixed(
                mainQuantity,
                SpotSymbolData[SignalCurrency].QuantityPrecision
            );

            // Remove all order from 'OrderListMonitor'
            const OrderUUIDRegex = new RegExp(
                `${Username};${ChatID};(.*)`,
                'g'
            );

            // Remove take profit
            var RemoveIndex = global.SpotMonitorList.TakeProfit.map(
                (Order, OrderIndex) => {
                    if (Order.match(OrderUUIDRegex)) return OrderIndex;
                }
            ).filter(function (Element) {
                return Element != null;
            });

            for (var i = RemoveIndex.length - 1; i >= 0; i--)
                global.SpotMonitorList.TakeProfit.splice(RemoveIndex[i], 1);

            DoneTargets[HitedIndex].Hit = true;
            DoneTargets[HitedIndex].HitDate = new Date(Date.now());

            var SignalStatus;
            var mainQuantity;
            if (HitedIndex === DoneTargets.length - 1) {
                SignalStatus = 'take_profit';

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.DoneTargets': []
                    }
                });

                setTimeout(async () => {
                    DoneTargets.map(async (NewTarget) => {
                        var DN = {
                            OrderID: NewTarget.OrderID,
                            TargetCreationDate: NewTarget.TargetCreationDate,
                            Price: NewTarget.Price,
                            OrderQuantity: NewTarget.OrderQuantity,
                            Hit: NewTarget.Hit,
                            Type: 'take_profit'
                        };

                        if (NewTarget.Hit) {
                            if (!NewTarget.HitDate)
                                DN.HitDate = new Date(Date.now());
                        }

                        await User.UpdateUserSignal(Username, ChatID, {
                            $push: DN
                        });
                    });
                });

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.Quantity': mainQuantity
                    }
                });
            } else {
                SignalStatus = `target-${HitedIndex + 1}`;

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.DoneTargets': []
                    }
                });

                // DoneTargets[HitedIndex].Hit = true;

                var NewQuantity =
                    parseFloat(UserSignal.Quantity) -
                    parseFloat(DoneTargets[HitedIndex].OrderQuantity);

                await User.UpdateUserSignal(Username, ChatID, {
                    $set: {
                        'Signals.$.Quantity': NewQuantity
                    }
                });

                setTimeout(async () => {
                    DoneTargets.map(async (NewTarget) => {
                        var DN = {
                            OrderID: NewTarget.OrderID,
                            TargetCreationDate: NewTarget.TargetCreationDate,
                            Price: NewTarget.Price,
                            OrderQuantity: NewTarget.OrderQuantity,
                            Hit: NewTarget.Hit,
                            Type: 'take_profit'
                        };

                        if (NewTarget.Hit) {
                            if (!NewTarget.HitDate)
                                DN.HitDate = new Date(Date.now());
                        }

                        OrderStatus = await User.UpdateUserSignal(
                            Username,
                            ChatID,
                            {
                                $push: {
                                    'Signals.$.DoneTargets': DN
                                }
                            }
                        );
                    });
                }, 2000);
            }

            // Update signal
            await User.UpdateUserSignal(Username, ChatID, {
                $set: {
                    'Signals.$.PositionStatus': SignalStatus
                }
            });
        }
    }

    async RunSpotChecker() {
        // Get all spot users
        const AllSpotUsers = await this.ReadyOrders();

        // Ready all orders
        AllSpotUsers.map((User) => {
            User.Signals.map((Signal) => {
                var SignalCurrency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

                // Add currency to monitor list
                if (this.CurrencyListMonitor.indexOf(SignalCurrency) === -1)
                    this.CurrencyListMonitor.push(SignalCurrency);

                var TakeProfits = [];
                var StopLoss = [];

                var OrderType = '';

                for (var i = 0; i < Signal.DoneTargets.length; i++) {
                    if (Signal.DoneTargets[i].Type === 'oco_order') {
                        OrderType = 'oco_order';
                        if (
                            typeof Signal.DoneTargets[i].Hit === 'undefined' ||
                            !Signal.DoneTargets[i].Hit
                        ) {
                            TakeProfits.push(Signal.DoneTargets[i].TPOrderID);
                            StopLoss.push(Signal.DoneTargets[i].SLOrderID);
                        }
                    } else if (Signal.DoneTargets[i].Type === 'take_profit') {
                        OrderType = 'manual';

                        if (
                            typeof Signal.DoneTargets[i].Hit === 'undefined' ||
                            !Signal.DoneTargets[i].Hit
                        )
                            TakeProfits.push(Signal.DoneTargets[i].OrderID);
                    } else if (Signal.DoneTargets[i].Type === 'stoploss') {
                        OrderType = 'manual';

                        if (
                            typeof Signal.DoneTargets[i].Hit === 'undefined' ||
                            !Signal.DoneTargets[i].Hit
                        )
                            StopLoss.push(Signal.DoneTargets[i].OrderID);
                    }
                }

                this.AddOrderToMonitorList(
                    SignalCurrency,
                    User.Username,
                    Signal.SignalChatID,
                    TakeProfits,
                    StopLoss,
                    OrderType
                );
            });
        });

        this.AddSpotTradeWS();
    }

    async ReadyOrders() {
        try {
            var AllUsers = await DataBaseQuery.AsyncMakeDatabaseQuery({
                DBQueryMethod: 'Select',
                MethodData: {
                    ModelName: 'exb-users',
                    SelectKeys: 'Username Signals',
                    SelectOptions: {},
                    Where: {
                        $or: [
                            { 'TradeSpan.Binance.SpotUSDT': true },
                            { 'TradeSpan.Binance.SpotBTC': true }
                        ]
                    }
                }
            });

            var NewUsers = AllUsers[1].map((UserData) => {
                let { Username, Signals } = UserData;

                var FilterSignal = Signals.filter((Signal) => {
                    if (
                        Signal.ExchangeType[0] === 'binance-spot' &&
                        /(?:^|W)(open|target-(.*))(?:$|W)/i.test(
                            Signal.PositionStatus
                        )
                    )
                        return Signal;
                });

                return {
                    Username: Username,
                    Signals: FilterSignal
                };
            });

            return NewUsers;
        } catch (DatabaseError) {
            throw new Error(DatabaseError);
        }
    }

    AddOrderToMonitorList(
        Currency,
        Username,
        ChatID,
        TakeProfits,
        StopLoss,
        OrderType
    ) {
        // Ready take profits
        var NewTP = TakeProfits.map((OrderID) => {
            var OrderUUIDGen = `${Username};${ChatID};${OrderID};${OrderType}`;

            if (global.SpotMonitorList.TakeProfit.indexOf(OrderUUIDGen) > -1)
                return null;
            else return OrderUUIDGen;
        });

        NewTP = NewTP.filter(function (Element) {
            return Element != null;
        });

        // Ready stoploss
        var NewSL = StopLoss.map((OrderID) => {
            var OrderUUIDGen = `${Username};${ChatID};${OrderID};${OrderType}`;

            if (global.SpotMonitorList.StopLoss.indexOf(OrderUUIDGen) > -1)
                return null;
            else return OrderUUIDGen;
        });

        NewSL = NewSL.filter(function (Element) {
            return Element != null;
        });

        // Add to list
        global.SpotMonitorList.TakeProfit = [
            ...global.SpotMonitorList.TakeProfit,
            ...NewTP
        ];
        global.SpotMonitorList.StopLoss = [
            ...global.SpotMonitorList.StopLoss,
            ...NewSL
        ];

        console.log(global.SpotMonitorList, 'global.SpotMonitorList');

        // Add currency to monitor list
        if (this.CurrencyListMonitor.indexOf(Currency) === -1)
            this.CurrencyListMonitor.push(Currency);

        if (!this.LastTradeWSID) this.AddSpotTradeWS();
    }

    GenRandomOI() {
        return Math.floor(Math.random() * 100000000);
    }

    AddSpotTradeWS() {
        console.log('We call AddSpotTradeWS');
        // Terminate Last trade websocket
        if (this.LastTradeWSID) {
            global.BinanceSpot.BinanceConnection.websockets.terminate(
                this.LastTradeWSID
            );
        }

        // console.log(this.CurrencyListMonitor, 'this.CurrencyListMonitor');

        var Self = this;

        this.LastTradeWSID =
            global.BinanceSpot.BinanceConnection.websockets.trades(
                this.CurrencyListMonitor,
                (Trades) => {
                    let { a: TradeID } = Trades;
                    // console.log(TradeID, 'TradeID');
                    // TradeID = 423174070;

                    var TakeProfitHitedIndex =
                        global.SpotMonitorList.TakeProfit.findIndex(
                            (TP) => TradeID.toString() === TP.split(';')[2]
                        );

                    if (TakeProfitHitedIndex > -1) {
                        return this.TakeProfitHited(
                            global.SpotMonitorList.TakeProfit[
                                TakeProfitHitedIndex
                            ]
                        );
                    }

                    var StopLossHitedIndex =
                        global.SpotMonitorList.StopLoss.findIndex(
                            (SL) => TradeID.toString() === SL.split(';')[2]
                        );

                    if (StopLossHitedIndex > -1) {
                        return this.StopLossHited(
                            global.SpotMonitorList.StopLoss[StopLossHitedIndex]
                        );
                    }
                }
            );

        this.RenewTradeWS();
    }

    RenewTradeWS() {
        var Self = this;

        setInterval(() => {
            // Terminate Last trade websocket
            if (Self.LastTradeWSID) {
                global.BinanceSpot.BinanceConnection.websockets.terminate(
                    Self.LastTradeWSID
                );
            }

            Self.LastTradeWSID =
                global.BinanceSpot.BinanceConnection.websockets.trades(
                    Self.CurrencyListMonitor,
                    (Trades) => {
                        let { a: TradeID } = Trades;
                        // console.log(TradeID, 'TradeID');
                        // TradeID = 423174070;

                        var TakeProfitHitedIndex =
                            global.SpotMonitorList.TakeProfit.findIndex(
                                (TP) => TradeID.toString() === TP.split(';')[2]
                            );

                        if (TakeProfitHitedIndex > -1) {
                            return Self.TakeProfitHited(
                                global.SpotMonitorList.TakeProfit[
                                    TakeProfitHitedIndex
                                ]
                            );
                        }

                        var StopLossHitedIndex =
                            global.SpotMonitorList.StopLoss.findIndex(
                                (SL) => TradeID.toString() === SL.split(';')[2]
                            );

                        if (StopLossHitedIndex > -1) {
                            return Self.StopLossHited(
                                global.SpotMonitorList.StopLoss[
                                    StopLossHitedIndex
                                ]
                            );
                        }
                    }
                );
            // }, 60000);
        }, 1800000);
    }

    ToFixed(Number, Fixed) {
        // var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
        // return Number.toString().match(Regex)[0];
        return parseFloat(Number).toFixed(Fixed);
    }

    // async CandleSignalQuantity() {}

    // async ReadyOrderIDsCandle() {
    // 	try {
    // 		var AllOpenOrderID = await DataBaseQuery.AsyncMakeDatabaseQuery({
    // 			DBQueryMethod: 'Select',
    // 			MethodData: {
    // 				ModelName: 'exb-signals',
    // 				SelectKeys: 'ChatID ExchangeType Currency PositionOrderID DoneTargets Targets StopLoss EntryPrice',
    // 				SelectOptions: {},
    // 				Where: {
    // 					PositionStatus: { $regex: '(?:^|W)(open|target-(.*))(?:$|W)', $options: 'i' },
    // 					StopLoss: { Type: 'manual' }
    // 				}
    // 			}
    // 		});

    // 		return AllOpenOrderID[1];
    // 	} catch (DatabaseError) {
    // 		throw new Error(DatabaseError);
    // 	}
    // }

    /* -------------------------------------------------------------------------- */
    /*          All the following methods are related to the old version          */
    /* -------------------------------------------------------------------------- */

    async ReadyOrderIDs() {
        try {
            var AllOpenOrderID = await DataBaseQuery.AsyncMakeDatabaseQuery({
                DBQueryMethod: 'Select',
                MethodData: {
                    ModelName: 'exb-signals',
                    SelectKeys:
                        'ChatID ExchangeType Currency PositionOrderID DoneTargets Targets StopLoss EntryPrice Quantity',
                    SelectOptions: {},
                    Where: {
                        PositionStatus: {
                            $regex: '(?:^|W)(open|target-(.*))(?:$|W)',
                            $options: 'i'
                        }
                        // StopLoss: { Type: 'normal' }
                    }
                }
            });

            return AllOpenOrderID[1];
        } catch (DatabaseError) {
            throw new Error(DatabaseError);
        }
    }

    OCOStatusAnalysis(SLData, TPData) {
        if (
            this.APIHitStatus.indexOf(SLData.status) > -1 &&
            TPData.status === 'EXPIRED'
        )
            return 'stoploss';
        else if (
            this.APIHitStatus.indexOf(TPData.status) > -1 &&
            SLData.status === 'EXPIRED'
        )
            return 'take_profit';
        else return 'not_hited';
    }

    CancelAllOCOOrders(Currency, DoneTargets, BinanceConnection) {
        DoneTargets.map(async (Target) => {
            if (Target.SLOrderID === 111) return;

            try {
                await this.CancelOrder(
                    Currency,
                    Target.SLOrderID,
                    BinanceConnection
                );
            } catch (ReturnError) {
                console.log(ReturnError, 'CancelAllOCOOrders');
                return false;
            }
        });
    }

    async OrderOCO(
        TargetCreationDate,
        Currency,
        Quantity,
        Price,
        StopLoss,
        ChatID,
        Hit,
        HitDate,
        BinanceConnection,
        Username
    ) {
        if (typeof StopLoss === 'object') StopLoss = StopLoss.Target;

        var StopPriceLimit;
        if (Currency.indexOf('USDT') > -1) {
            StopPriceLimit = parseFloat(
                parseFloat(StopLoss) + parseFloat(StopLoss) * 0.0001
            );
        } else {
            StopPriceLimit = this.ToFixed(
                parseFloat(
                    parseFloat(StopLoss) + parseFloat(StopLoss) * 0.0001
                ),
                SpotSymbolData[Currency].PricePrecision
            );
        }

        Price = this.ToFixed(Price, SpotSymbolData[Currency].PricePrecision);
        StopLoss = this.ToFixed(
            StopLoss,
            SpotSymbolData[Currency].PricePrecision
        );

        try {
            var OrderStatus;
            if (!Hit) {
                OrderStatus = await BinanceConnection.sell(
                    Currency,
                    this.ScientificToDecimal(parseFloat(Quantity)),
                    this.ScientificToDecimal(parseFloat(Price)),
                    {
                        type: 'OCO',
                        price: this.ScientificToDecimal(parseFloat(Price)),
                        quantity: this.ScientificToDecimal(
                            parseFloat(Quantity)
                        ),
                        side: 'SELL',
                        stopLimitPrice: this.ScientificToDecimal(
                            parseFloat(StopLoss)
                        ),
                        stopLimitTimeInForce: 'GTC',
                        stopPrice: this.ScientificToDecimal(StopLoss),
                        symbol: Currency
                    }
                );

                let SLOrderID = OrderStatus.orderReports.filter((SLItem) => {
                    if (SLItem.type === 'STOP_LOSS_LIMIT') return SLItem;
                });

                var StopLossOrderID = SLOrderID[0].orderId;
                if (typeof StopLossOrderID === 'object')
                    StopLossOrderID = StopLossOrderID.toString();

                let TPOrderID = OrderStatus.orderReports.filter((TPItem) => {
                    if (TPItem.type === 'LIMIT_MAKER') return TPItem;
                });

                var TakeProfitOrderID = TPOrderID[0].orderId;
                if (typeof TakeProfitOrderID === 'object')
                    TakeProfitOrderID = TakeProfitOrderID.toString();

                // this.FakeTradeID.push(TPOrderID[0].orderId);

                this.AddOrderToMonitorList(
                    Currency,
                    Username,
                    ChatID,
                    [TakeProfitOrderID],
                    [StopLossOrderID],
                    'oco_order'
                );

                // Add order to user
                OrderStatus = await User.UpdateUserSignal(Username, ChatID, {
                    $push: {
                        'Signals.$.DoneTargets': {
                            OrderListID: OrderStatus.orderListId,
                            TargetCreationDate: TargetCreationDate,
                            SLOrderID: StopLossOrderID,
                            TPOrderID: TakeProfitOrderID,
                            OrderQuantity: Quantity,
                            Price: this.ScientificToDecimal(Price),
                            Hit: false,
                            Type: 'oco_order'
                        }
                    }
                });
            } else {
                var DN = {
                    OrderListID: 111,
                    TargetCreationDate: TargetCreationDate,
                    HitDate: new Date(Date.now()),
                    SLOrderID: 111,
                    TPOrderID: 111,
                    OrderQuantity: this.ScientificToDecimal(Quantity),
                    Price: this.ScientificToDecimal(Price),
                    Hit: true,
                    Type: 'oco_order'
                };

                if (typeof HitDate === 'undefined')
                    DN.HitDate = new Date(Date.now());
                else DN.HitDate = HitDate;

                // Add order to user
                OrderStatus = await User.UpdateUserSignal(Username, ChatID, {
                    $push: {
                        'Signals.$.DoneTargets': DN
                    }
                });
            }

            return OrderStatus;
        } catch (ReturnError) {
            return false;
        }
    }

    FindPositionNumber(DoneTargets, Targets, Price) {
        try {
            var SortableTargets = Targets.sort();

            if (SortableTargets.indexOf(parseFloat(Price)) > -1) {
                let HitedIndex = SortableTargets.indexOf(parseFloat(Price));

                DoneTargets = DoneTargets.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                );

                if (HitedIndex === SortableTargets.length - 1) {
                    HitedIndex = 'take_profit';
                } else {
                    DoneTargets[HitedIndex].Hit = true;
                }

                return {
                    TargetNumber: HitedIndex,
                    NewDoneTargets: DoneTargets
                };
            } else {
                return 'error';
            }
        } catch (ReturnError) {
            return false;
        }
    }

    CheckOrderIDs(Signals) {
        Signals.map(async (Signal) => {
            try {
                // Check exchange type
                if (Signal.ExchangeType[0] != 'binance-spot') return;

                if (!Signal.DoneTargets.length) return;

                const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

                // Check all targets
                for (var i = 0; i < Signal.DoneTargets.length; i++) {
                    if (Signal.StopLoss.Type === 'manual') {
                        if (Signal.DoneTargets[i].Hit) return;

                        const OrderStatus = await this.OrderStatus(
                            Currency,
                            Signal.DoneTargets[i].OrderID
                        );

                        // Take profit hited
                        if (
                            this.APIHitStatus.indexOf(OrderStatus.status) > -1
                        ) {
                            // Update DoneTarget
                            await DataBaseQuery.AsyncMakeDatabaseQuery({
                                DBQueryMethod: 'Update',
                                MethodData: {
                                    ModelName: 'exb-signals',
                                    MongooseUMO: { multi: false },
                                    NewData: {
                                        $set: {
                                            'DoneTargets.$.Hit': true
                                        }
                                    },
                                    Which: {
                                        ChatID: Signal.ChatID,
                                        'DoneTargets.Price':
                                            Signal.DoneTargets[
                                                i
                                            ].Price.toString()
                                    }
                                }
                            });

                            // Update position status
                            SignalUpdate.SignalUpdate(Signal.ChatID, {
                                $set: {
                                    Quantity:
                                        parseFloat(Signal.Quantity) -
                                        parseFloat(
                                            Signal.DoneTargets[i].OrderQuantity
                                        ),
                                    PositionStatus: `target-${i + 1}`
                                }
                            });
                        }
                    } else if (Signal.StopLoss.Type === 'normal') {
                        if (!Signal.DoneTargets[i].Hit) {
                            const OCOStatus = this.OCOStatusAnalysis(
                                await this.OrderStatus(
                                    Currency,
                                    Signal.DoneTargets[i].SLOrderID
                                ),
                                await this.OrderStatus(
                                    Currency,
                                    Signal.DoneTargets[i].TPOrderID
                                )
                            );

                            if (OCOStatus != 'not_hited') {
                                var PositionStatus;

                                const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

                                this.CancelAllOCOOrders(
                                    Currency,
                                    Signal.DoneTargets
                                );

                                if (OCOStatus === 'stoploss') {
                                    PositionStatus = OCOStatus;
                                }

                                if (OCOStatus === 'take_profit') {
                                    var NewData = this.FindPositionNumber(
                                        Signal.DoneTargets,
                                        Signal.Targets,
                                        Signal.DoneTargets[i].Price
                                    );

                                    if (NewData.TargetNumber != 'take_profit') {
                                        PositionStatus = `target-${
                                            NewData.TargetNumber + 1
                                        }`;

                                        var StopLoss;
                                        if (NewData.TargetNumber === 0) {
                                            StopLoss = Signal.EntryPrice;
                                        } else {
                                            StopLoss =
                                                Signal.DoneTargets[
                                                    NewData.TargetNumber - 1
                                                ].Price;
                                        }

                                        await SignalUpdate.SignalUpdate(
                                            Signal.ChatID,
                                            {
                                                $set: {
                                                    DoneTargets: []
                                                }
                                            }
                                        );

                                        setTimeout(async () => {
                                            NewData.NewDoneTargets.map(
                                                async (NewTarget) => {
                                                    this.OrderOCO(
                                                        NewTarget.TargetCreationDate,
                                                        Currency,
                                                        this.ToFixed(
                                                            NewTarget.OrderQuantity,
                                                            SpotSymbolData[
                                                                Currency
                                                            ].QuantityPrecision
                                                        ),
                                                        NewTarget.Price,
                                                        StopLoss,
                                                        Signal.ChatID,
                                                        NewTarget.Hit
                                                    ).catch(
                                                        (ReturnError) => {}
                                                    );
                                                }
                                            );
                                        }, 2000);
                                    } else {
                                        PositionStatus = NewData.TargetNumber;
                                    }
                                }

                                // Update position status
                                SignalUpdate.SignalUpdate(Signal.ChatID, {
                                    $set: {
                                        PositionStatus: PositionStatus
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (ReturnErrorAll) {}
        });
    }

    async CancelOrder(Currency, OrderID, BinanceConnection) {
        return new Promise((Resolve, Reject) => {
            BinanceConnection.cancel(
                Currency,
                OrderID,
                (Error, Response, Symbol) => {
                    if (Error) {
                        Reject(Error);
                    }

                    Resolve(Response);
                }
            );
        });
    }

    async OrderStatus(Currency, OrderID, BinanceConnection) {
        return new Promise((Resolve, Reject) => {
            BinanceConnection.orderStatus(
                Currency,
                OrderID,
                (Error, Response, Symbol) => {
                    if (Error) Reject(Error);

                    Resolve(Response);
                }
            );
        });
    }
}

module.exports = SpotPositionChecker;
