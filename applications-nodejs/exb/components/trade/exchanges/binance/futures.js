const BinanceAPI = require('node-binance-api');
const BigNumber = require('bignumber.js');
var JSONbig = require('json-bigint');

const DataBaseQuery = require('../../../database/database-query').DatabaseQuery;
const SignalUpdate =
    require(`${__dirname}/../../../analysis/signals-query/signal-update`).SignalUpdate;
const HandleTradeError =
    require(`${__dirname}/../../handle-trade-errors`).HandleTradeError;
const BinanceTools = require(`${__dirname}/binance-tools.js`);
const User = require(`${__dirname}/../../../user/user.js`).User;

const SymbolData = require(`${__dirname}/../../../../../../storage/exchange-data/symbol-data-futures.json`);

class MainBinanceFutures extends BinanceTools {
    USDT_BALANCE;
    BTC_BALANCE;
    FSTimeout;

    FUTURES_CONNECTION = {};

    PendingPositions = {
        Open: {},
        Opening: {}
    };

    constructor() {
        super('futures');

        this.FSTimeout = false;

        this.FUTURES_CONNECTION = new BinanceAPI().options({
            APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
            APISECRET:
                'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM',
            verbose: true,
            hedgeMode: true
            // test: true
        });

        // this.FSTimeout = this.FSTimeout.bind(this);
        this.CheckPendingPositions = this.CheckPendingPositions.bind(this);
        this.RefreshPendingRequest = this.RefreshPendingRequest.bind(this);
        this.TimeDifference = this.TimeDifference.bind(this);
        this.AddToPendingPositions = this.AddToPendingPositions.bind(this);
        this.Trade = this.Trade.bind(this);
        this.CalculationQuantity = this.CalculationQuantity.bind(this);
        this.SetMarginType = this.SetMarginType.bind(this);
        this.SetLeverage = this.SetLeverage.bind(this);
        this.MarketLongPosition = this.MarketLongPosition.bind(this);
        this.MarketShortPosition = this.MarketShortPosition.bind(this);
        this.MarketLongPositionRM = this.MarketLongPositionRM.bind(this);
        this.MarketShortPositionRM = this.MarketShortPositionRM.bind(this);
        this.OrderLongPosition = this.OrderLongPosition.bind(this);
        this.OrderShortPosition = this.OrderShortPosition.bind(this);
        this.AddTP = this.AddTP.bind(this);
        this.AddSL = this.AddSL.bind(this);
        this.FuturesMarkPriceStream = this.FuturesMarkPriceStream.bind(this);

        this.USDT_BALANCE_FUTURES = 350;

        setInterval(() => {
            this.RefreshPendingRequest();
        }, 10000);

        // (async () => {
        // 	await this.AddFromDatabase();
        // })();
    }

    async GetSignal(ChatID) {
        try {
            var Signal = await DataBaseQuery.AsyncMakeDatabaseQuery({
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
        const UsersPack = await User.GetTradeUsers(
            'Futures',
            Signal.Currency[1]
        );

        // const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

        // // Sort prices
        // if (Signal.ExchangeType[1] === 'long')
        // 	Signal.Targets = Signal.Targets.sort(function(a, b) {
        // 		return parseFloat(a) - parseFloat(b);
        // 	});
        // if (Signal.ExchangeType[1] === 'short')
        // 	Signal.Targets = Signal.Targets.sort(function(a, b) {
        // 		return parseFloat(b) - parseFloat(a);
        // 	});

        // Market currency
        UsersPack.map((UserList, UserIndex) => {
            setTimeout(() => {
                UserList.map(async (UserItem) => {
                    Signal = await this.GetSignal(Signal.ChatID);

                    const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

                    if (Signal.ExchangeType[1] === 'long')
                        Signal.Targets = Signal.Targets.sort(function (a, b) {
                            return parseFloat(a) - parseFloat(b);
                        });
                    if (Signal.ExchangeType[1] === 'short')
                        Signal.Targets = Signal.Targets.sort(function (a, b) {
                            return parseFloat(b) - parseFloat(a);
                        });

                    /* ------------------- Add first open target and stoploss ------------------- */
                    if (Signal.OpenTargets[0])
                        Signal.Targets.push(Signal.OpenTargets[0]);

                    console.log(Signal.Targets, 'Signal.Targets');

                    var UserPrices = Signal.Targets;

                    var { BinanceConnection } = UserItem;

                    try {
                        /* ---------------------------- Balance Check ---------------------------- */
                        let AssetBalance = await this.FuturesCheckBalance(
                            BinanceConnection
                        );

                        console.log(AssetBalance, 'AssetBalance');

                        if (Signal.Currency[1] === 'USDT') {
                            const AmountRequired = parseFloat(
                                (Signal.Capital.Percentage *
                                    parseInt(
                                        UserItem.ExchangesData.Binance
                                            .FuturesCeilingAmount.USDT
                                    )) /
                                    100
                            );

                            if (AmountRequired > parseFloat(AssetBalance)) {
                                let Difference =
                                    AmountRequired - parseFloat(AssetBalance);
                                Difference = Difference + AmountRequired * 0.3;

                                console.log(
                                    await this.SpotToFutures(
                                        Math.ceil(Difference),
                                        BinanceConnection
                                    ),
                                    'SpotToFutures',
                                    Difference,
                                    Math.ceil(Difference),
                                    UserItem.Username
                                );
                            }

                            await this.Sleep(2000);
                        }

                        /* ------------------------- Calculation quantity ------------------------ */

                        const Quantity = await this.CalculationQuantity(
                            {
                                USDT_BALANCE_FUTURES:
                                    UserItem.ExchangesData.Binance
                                        .FuturesCeilingAmount.USDT
                            },
                            Signal.Capital.Percentage,
                            Currency,
                            parseFloat(CurrencyPrice),
                            Signal.ExchangeType[0],
                            Signal.Capital.Range[
                                Signal.Capital.Range.length - 1
                            ],
                            Signal.Currency[1]
                        );

                        /* ------------------------ Market and update signal ------------------------ */
                        var PositionType;
                        var MainPositionStatus;

                        if (Signal.ExchangeType[1] === 'long') {
                            PositionType = 'MarketLongPosition';
                            MainPositionStatus = await this.MarketLongPosition(
                                Currency,
                                Quantity.CalculatedQuantity,
                                Signal.Capital.Leverage,
                                Signal.Capital.Range[
                                    Signal.Capital.Range.length - 1
                                ],
                                Signal.ChatID,
                                BinanceConnection
                            );
                        }

                        if (Signal.ExchangeType[1] === 'short') {
                            PositionType = 'MarketShortPosition';
                            MainPositionStatus = await this.MarketShortPosition(
                                Currency,
                                Quantity.CalculatedQuantity,
                                Signal.Capital.Leverage,
                                Signal.Capital.Range[
                                    Signal.Capital.Range.length - 1
                                ],
                                Signal.ChatID,
                                BinanceConnection
                            );
                        }

                        console.log(
                            CurrencyPrice,
                            'CurrencyPrice',
                            UserItem.Username,
                            Signal.ChatID
                        );

                        console.log(
                            Quantity,
                            'Quantity',
                            UserItem.Username,
                            Signal.ChatID
                        );

                        console.log(
                            MainPositionStatus,
                            'MainPositionStatus',
                            UserItem.Username,
                            Signal.ChatID
                        );

                        if (MainPositionStatus) {
                            var PositionOrderID = MainPositionStatus.orderId;
                            if (
                                typeof MainPositionStatus.orderId === 'object'
                            ) {
                                PositionOrderID = PositionOrderID.toString();
                            }

                            User.AddSignalToUser(UserItem.Username, {
                                SignalChatID: Signal.ChatID,
                                SignalEntryDate: new Date(Date.now()),
                                ExchangeType: Signal.ExchangeType,
                                Currency: Signal.Currency,
                                DoneTargets: [],
                                Capital: Signal.Capital,
                                PositionStatus: 'open',
                                Quantity: Quantity.CalculatedQuantity,
                                EntryPrice: parseFloat(CurrencyPrice),
                                StopLoss: Signal.StopLoss,
                                PositionOrderID: PositionOrderID
                            });

                            /* ---------------- Calculate new quantity for targets order ---------------- */
                            // const NewQuantity = this.ToFixed(
                            //     Quantity.CalculatedQuantity * 0.99,
                            //     SpotSymbolData[Currency].QuantityPrecision
                            // );

                            /* ------------------- Add first open target and stoploss ------------------- */
                            // if (Signal.OpenTargets[0]) {
                            // 	if (Signal.Targets.indexOf(Signal.OpenTargets[0]) === -1)
                            // 		Signal.Targets.push(Signal.OpenTargets[0]);
                            // }

                            /* ------------------------ Add takeprofit for signal ----------------------- */
                            this.AddTP(
                                Currency,
                                Signal.ExchangeType[1],
                                Quantity.CalculatedQuantity,
                                UserPrices,
                                Signal.Capital.Leverage,
                                Signal.Capital.Range[
                                    Signal.Capital.Range.length - 1
                                ],
                                Signal.ChatID,
                                BinanceConnection,
                                UserItem.Username
                            );

                            /* ------------------------- Add stoploss for signal ------------------------ */
                            this.AddSL(
                                Currency,
                                Signal.ExchangeType[1],
                                Quantity.CalculatedQuantity,
                                Signal.StopLoss.Number,
                                Signal.ChatID,
                                BinanceConnection,
                                UserItem.Username
                            );
                        } else {
                            User.AddSignalToUser(UserItem.Username, {
                                SignalChatID: Signal.ChatID,
                                ExchangeType: Signal.ExchangeType,
                                Currency: Signal.Currency,
                                DoneTargets: [],
                                PositionStatus: 'error-close',
                                Quantity: Quantity.CalculatedQuantity,
                                Capital: Signal.Capital,
                                StopLoss: Signal.StopLoss,
                                EntryPrice: 'error',
                                PositionOrderID: 'error'
                            });
                        }
                    } catch (ReturnError) {}
                });
            }, 2000 * UserIndex);
        });
    }

    async FuturesCheckBalance(BinanceConnection) {
        let Balances = await BinanceConnection.futuresBalance();

        const USDTData = Balances.filter((Balance) => {
            return Balance.asset === 'USDT';
        });

        return parseFloat(USDTData[0].maxWithdrawAmount);
    }

    async SpotToFutures(Amount, BinanceConnection) {
        let TranStatus = await BinanceConnection.transferMainToFutures(
            'USDT',
            Amount
        );

        console.log(TranStatus, 'TranStatus');

        if (!TranStatus.tranId) return false;

        return true;
    }

    RefreshPendingRequest() {
        // Refresh opening signals
        Object.keys(this.PendingPositions.Opening).map((SignalCurrency) => {
            this.PendingPositions.Opening[SignalCurrency].map(
                async (Signal, SignalIndex) => {
                    if (this.TimeDifference(Signal.SignalDate) > 1440) {
                        // Delete signal
                        this.PendingPositions.Opening[SignalCurrency].splice(
                            SignalIndex,
                            1
                        );

                        // Update signal
                        await SignalUpdate.SignalUpdate(Signal.ChatID, {
                            $set: {
                                PositionStatus: 'expired'
                            }
                        });
                    }
                }
            );
        });

        // Refresh open signals
        Object.keys(this.PendingPositions.Open).map((SignalCurrency) => {
            this.PendingPositions.Open[SignalCurrency].map(
                async (Signal, SignalIndex) => {
                    if (this.TimeDifference(Signal.SignalDate) > 30) {
                        // Delete signal
                        this.PendingPositions.Open[SignalCurrency].splice(
                            SignalIndex,
                            1
                        );
                    }
                }
            );
        });
    }

    TimeDifference(SignalDate) {
        var Diff =
            (new Date(Date.now()).getTime() - SignalDate.getTime()) / 1000;
        Diff /= 60;

        return Math.abs(Math.round(Diff));
    }

    CheckPendingPositions(Prices) {
        var PricesFilter = {};

        Prices.forEach((SymbolItem) => {
            if (SymbolItem.eventType === 'markPriceUpdate')
                PricesFilter[SymbolItem.symbol] = SymbolItem.markPrice;
        });

        Object.keys(this.PendingPositions.Opening).map((SignalCurrency) => {
            this.PendingPositions.Opening[SignalCurrency].map(
                async (Signal, SignalIndex) => {
                    var InRange = false;

                    Signal.EnterPrice = Signal.EnterPrice.sort(
                        (a, b) => parseFloat(a) - parseFloat(b)
                    );
                    if (
                        parseFloat(PricesFilter[SignalCurrency]) >=
                            parseFloat(Signal.EnterPrice[0]) &&
                        parseFloat(PricesFilter[SignalCurrency]) <=
                            parseFloat(Signal.EnterPrice[1])
                    ) {
                        InRange = true;
                    }

                    if (InRange) {
                        // Create currency symbol
                        const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;

                        if (!this.PendingPositions.Open[SignalCurrency])
                            this.PendingPositions.Open[SignalCurrency] = [];

                        this.PendingPositions.Open[SignalCurrency].push(Signal);
                        this.PendingPositions.Opening[SignalCurrency].splice(
                            SignalIndex,
                            1
                        );

                        await this.MultiUserTrade(
                            Signal,
                            PricesFilter[SignalCurrency]
                        );

                        // Update main signal
                        SignalUpdate.SignalUpdate(Signal.ChatID, {
                            $set: {
                                PositionStatus: 'open',
                                EntryPrice: PricesFilter[SignalCurrency],
                                SignalEntryDate: new Date(Date.now())
                            }
                        });
                    }
                }
            );
        });

        this.RefreshPendingRequest();
    }

    AddToPendingPositions(Signal) {
        let { Currency, ExchangeType } = Signal;

        if (ExchangeType[0] != 'binance-futures') return;

        Currency = Currency.toString().replace(/(,| )/gi, '');

        try {
            if (!this.PendingPositions.Opening[Currency])
                this.PendingPositions.Opening[Currency] = [];

            this.PendingPositions.Opening[Currency].push(Signal);
        } catch (AddError) {}
    }

    async Trade(Signal) {
        // Wrong signal
        if (
            Signal.ExchangeType[0] != 'binance-futures' ||
            ['long', 'short'].indexOf(Signal.ExchangeType[1]) === -1
        ) {
            HandleTradeError.SignalError(Signal, -7000);
        } else {
            this.AddToPendingPositions(Signal);
        }
    }

    // async CalculationQuantity(Capital, Currency, CurrencyPrice, Leverage) {

    // 	let USDTQuantity = parseInt(this.USDT_BALANCE * parseInt(Capital) / 100);

    // 	const CalculatedQuantity = (USDTQuantity / CurrencyPrice * Leverage).toFixed(
    // 		SymbolData[Currency].QuantityPrecision
    // 	);

    // 	if (CalculatedQuantity > parseFloat(SymbolData[Currency].MaxQuantity)) {
    // 		return { Status: false, ErrorCode: -7001 };
    // 	} else if (CalculatedQuantity < parseFloat(SymbolData[Currency].MinQuantity)) {
    // 		return { Status: false, ErrorCode: -7002 };
    // 	}

    // 	return { Status: true, CalculatedQuantity: CalculatedQuantity };
    // }

    async SetMarginType(Currency, MarginType, BinanceConnection) {
        // if (!global.BinanceFutures.BinanceConnection) this.CreateBinanceConnection();

        await BinanceConnection.futuresMarginType(
            Currency,
            MarginType.toUpperCase()
        );
    }

    async SetLeverage(Currency, Leverage, BinanceConnection) {
        // // if (!global.BinanceFutures.BinanceConnection) this.CreateBinanceConnection();
        try {
            await BinanceConnection.futuresLeverage(Currency, Leverage);
        } catch (ReturnError) {}
    }

    async MarketLongPositionRM(Currency, Quantity, MarginType, Leverage) {
        // // if (!global.BinanceFutures.BinanceConnection) this.CreateBinanceConnection();

        await this.SetMarginType(Currency, MarginType);
        await this.SetLeverage(Currency, Leverage);

        return await global.BinanceFutures.BinanceConnection.futuresMarketBuy(
            Currency,
            Quantity
        );
    }

    async MarketLongPosition(
        Currency,
        Quantity,
        MarginType,
        Leverage,
        ChatID,
        BinanceConnection
    ) {
        await this.SetMarginType(Currency, MarginType, BinanceConnection);
        await this.SetLeverage(Currency, Leverage, BinanceConnection);

        return await BinanceConnection.futuresMarketBuy(
            Currency,
            this.ScientificToDecimal(Quantity)
        );
    }

    async MarketShortPositionRM(Currency, Quantity, MarginType, Leverage) {
        await this.SetMarginType(Currency, MarginType);
        await this.SetLeverage(Currency, Leverage);

        return await global.BinanceFutures.BinanceConnection.futuresMarketSell(
            Currency,
            this.ScientificToDecimal(Quantity)
        );
    }

    async MarketShortPosition(
        Currency,
        Quantity,
        MarginType,
        Leverage,
        ChatID,
        BinanceConnection
    ) {
        await this.SetMarginType(Currency, MarginType, BinanceConnection);
        await this.SetLeverage(Currency, Leverage, BinanceConnection);

        return await BinanceConnection.futuresMarketSell(
            Currency,
            this.ScientificToDecimal(Quantity)
        );
    }

    async OrderLongPosition(
        Currency,
        Quantity,
        OpenOrderPrice,
        Leverage,
        MarginType,
        Last,
        BinanceConnection
    ) {
        // if (!global.BinanceFutures.BinanceConnection) this.CreateBinanceConnection();
        try {
            var Options = {
                positionSide: 'SHORT',
                side: 'BUY'
            };

            if (Last) {
                Options.placeType = 'position';
                Options.quantity = 0;
                Options.type = 'TAKE_PROFIT_MARKET';
                Options.closePosition = true;
                Options.workingType = 'MARK_PRICE';
                Options.stopPrice = this.ScientificToDecimal(
                    this.ToFixed(OpenOrderPrice, SymbolData[Currency].TickSize)
                );
                Quantity = 0;

                Options.timeInForce = 'GTE_GTC';
            } else {
                Options.timeInForce = 'GTC';
                Options.placeType = 'order-form';
                Options.quantity = this.ScientificToDecimal(Quantity);
                Options.price = this.ScientificToDecimal(
                    this.ToFixed(OpenOrderPrice, SymbolData[Currency].TickSize)
                );
                Options.type = 'LIMIT';
            }

            // console.log(Options, 'Options');

            const OrderStatus = await BinanceConnection.futuresBuy(
                Currency,
                this.ScientificToDecimal(Quantity),
                0,
                Options
            );

            return OrderStatus;
        } catch (ReturnError) {
            console.log(ReturnError, 'ReturnError OrderLongPosition');
            global.Logger.error(ReturnError);
        }
    }

    async OrderShortPosition(
        Currency,
        Quantity,
        OpenOrderPrice,
        Leverage,
        MarginType,
        Last,
        BinanceConnection
    ) {
        try {
            var Options = {
                positionSide: 'LONG',
                side: 'SELL'
            };

            if (Last) {
                Options.placeType = 'position';
                Options.quantity = 0;
                Options.closePosition = true;
                Options.workingType = 'MARK_PRICE';
                Options.stopPrice = this.ScientificToDecimal(
                    this.ToFixed(OpenOrderPrice, SymbolData[Currency].TickSize)
                );
                Options.type = 'TAKE_PROFIT_MARKET';
                Quantity = 0;

                Options.timeInForce = 'GTE_GTC';
            } else {
                Options.timeInForce = 'GTC';
                Options.placeType = 'order-form';
                Options.quantity = this.ScientificToDecimal(Quantity);
                Options.price = this.ScientificToDecimal(
                    this.ToFixed(OpenOrderPrice, SymbolData[Currency].TickSize)
                );
                Options.type = 'LIMIT';
            }

            // console.log(Options, 'Options');

            const OrderStatus = await BinanceConnection.futuresSell(
                Currency,
                this.ScientificToDecimal(Quantity),
                0,
                Options
            );

            return OrderStatus;
        } catch (ReturnError) {
            console.log(ReturnError, 'ReturnError OrderShortPosition');
            global.Logger.error(ReturnError);
        }
    }

    async AddSL(
        Currency,
        SignalSide,
        Quantity,
        StopPrice,
        ChatID,
        BinanceConnection,
        Username
    ) {
        let OrderStatus = {};
        var StoplossItem = [];

        if (SignalSide === 'long') {
            OrderStatus = await BinanceConnection.futuresSell(Currency, 0, 0, {
                positionSide: 'LONG',
                quantity: 0,
                side: 'SELL',
                placeType: 'position',
                closePosition: true,
                timeInForce: 'GTE_GTC',
                type: 'STOP_MARKET',
                stopPrice: this.ScientificToDecimal(
                    this.ToFixed(StopPrice, SymbolData[Currency].PricePrecision)
                ),
                workingType: 'MARK_PRICE'
            });
        } else if (SignalSide === 'short') {
            OrderStatus = await BinanceConnection.futuresBuy(Currency, 0, 0, {
                positionSide: 'SHORT',
                quantity: 0,
                side: 'BUY',
                closePosition: true,
                timeInForce: 'GTE_GTC',
                type: 'STOP_MARKET',
                stopPrice: this.ScientificToDecimal(
                    this.ToFixed(StopPrice, SymbolData[Currency].PricePrecision)
                ),
                workingType: 'MARK_PRICE'
            });
        }

        console.log(OrderStatus, 'OrderStatus Stoploss', Username, ChatID);

        var OrderID = OrderStatus.orderId;

        if (typeof OrderID === 'object') OrderID = OrderID.toString();

        StoplossItem.push(OrderID);

        setTimeout(() => {
            global.FuturesPositionChecker.AddOrderToMonitorList(
                Username,
                ChatID,
                [],
                StoplossItem,
                Currency
            );
        }, 20000);

        // Add order to user
        await User.UpdateUserSignal(Username, ChatID, {
            $push: {
                'Signals.$.DoneTargets': {
                    OrderID: OrderID,
                    OrderQuantity: Quantity,
                    TargetCreationDate: new Date(Date.now()),
                    Price: StopPrice,
                    Hit: false,
                    Type: 'stoploss'
                }
            }
        });
    }

    AddTP(
        Currency,
        SignalSide,
        Quantity,
        Prices,
        MarginType,
        Leverage,
        ChatID,
        BinanceConnection,
        Username
    ) {
        console.log(Username, 'ADDTP', Prices, 'Prices');

        let OrderType = '';
        if (SignalSide === 'long') OrderType = 'OrderShortPosition';
        if (SignalSide === 'short') OrderType = 'OrderLongPosition';

        var TargetCount = 0;
        var OverCurrencyQuantity = false;
        var TargetsQuantity = 0.0;
        while (!OverCurrencyQuantity) {
            console.log(
                SymbolData[Currency].QuantityPrecision,
                'SymbolData[Currency].QuantityPrecision',
                Username
            );

            TargetsQuantity = this.ToFixed(
                Quantity / (Prices.length - TargetCount),
                SymbolData[Currency].QuantityPrecision
            );
            if (TargetsQuantity >= SymbolData[Currency].MinQuantity)
                OverCurrencyQuantity = true;
            else TargetCount++;
        }

        var NewTargetsQuantity = this.ToFixed(
            TargetsQuantity,
            SymbolData[Currency].QuantityPrecision
        );

        console.log(
            NewTargetsQuantity,
            'NewTargetsQuantityNewTargetsQuantityNewTargetsQuantity'
        );

        // // Sort prices
        // if (SignalSide === 'long')
        // 	Prices.sort(function(a, b) {
        // 		return parseFloat(a) - parseFloat(b);
        // 	});
        // if (SignalSide === 'short')
        // 	Prices.sort(function(a, b) {
        // 		return parseFloat(b) - parseFloat(a);
        // 	});

        if (TargetCount) Prices.splice(-Math.abs(TargetCount));

        var RemainingQuantity = this.ToFixed(
            (TargetsQuantity - NewTargetsQuantity) * Prices.length,
            SymbolData[Currency].QuantityPrecision
        );

        console.log(Prices, 'Prices ADDTP', Username, ChatID);

        // var OtherRemainingQuantity = NewTargetsQuantity * Prices.length;
        // if (OtherRemainingQuantity < Quantity)
        // 	OtherRemainingQuantity = this.ToFixed(
        // 		Quantity - OtherRemainingQuantity,
        // 		SpotSymbolData[Currency].QuantityPrecision
        // 	);

        var TakeProfitItem = [];
        Prices.map(async (Price, PriceIndex) => {
            var LocalQuantity = 0.0;
            if (!PriceIndex)
                LocalQuantity = this.ToFixed(
                    parseFloat(NewTargetsQuantity) +
                        parseFloat(RemainingQuantity),
                    SymbolData[Currency].QuantityPrecision
                );
            else LocalQuantity = NewTargetsQuantity;

            var LastStatus = false;

            if (PriceIndex + 1 === Prices.length) LastStatus = true;

            var OrderStatus;
            if (SignalSide === 'long') {
                OrderStatus = await this.OrderShortPosition(
                    Currency,
                    LocalQuantity,
                    Price,
                    MarginType,
                    Leverage,
                    LastStatus,
                    BinanceConnection
                );
            }

            if (SignalSide === 'short') {
                OrderStatus = await this.OrderLongPosition(
                    Currency,
                    LocalQuantity,
                    Price,
                    MarginType,
                    Leverage,
                    LastStatus,
                    BinanceConnection
                );
            }

            console.log(OrderStatus, 'OrderStatus', Username, ChatID);

            if (PriceIndex + 1 === Prices.length) LastStatus = true;

            var OrderID = OrderStatus.orderId;

            if (typeof OrderID === 'object') {
                OrderID = OrderID.toString();
            }

            TakeProfitItem.push(OrderID.toString());

            // Add order to user
            await User.UpdateUserSignal(Username, ChatID, {
                $push: {
                    'Signals.$.DoneTargets': {
                        OrderID: OrderID,
                        TargetCreationDate: new Date(Date.now()),
                        OrderQuantity: LocalQuantity,
                        Price: Price,
                        Hit: false,
                        Type: 'take_profit'
                    }
                }
            });

            if (Prices.length - 1 === PriceIndex) {
                console.log('-----------------------------------');
                console.log('Calling AddOrderToMonitorList', Username);

                // TakeProfitItem = TakeProfitItem.filter(function(Element) {
                // 	return Element !== undefined;
                // });

                setTimeout(() => {
                    global.FuturesPositionChecker.AddOrderToMonitorList(
                        Username,
                        ChatID,
                        TakeProfitItem,
                        [],
                        Currency
                    );
                }, 20000);
            }
        });
    }

    FuturesMarkPriceStream() {
        global.BinanceFutures.BinanceConnection.futuresMarkPriceStream(
            this.CheckPendingPositions
        );
    }
}

module.exports = MainBinanceFutures;
