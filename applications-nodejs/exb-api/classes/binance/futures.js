const FuturesEXData = require('../../../../storage/exchange-data/symbol-data-futures.json');
var Futures = Futures || {};

Futures = {
	OrderStatus: async (Currency, OrderID, BinanceConnection) => {
		return await BinanceConnection.futuresOrderStatus(Currency, { orderId: OrderID });
	},

	CancelOrder: async (Currency, OrderID, BinanceConnection) => {
		return await BinanceConnection.futuresCancel(Currency, { orderId: OrderID });
	},

	ClosePosition: async (PositionType, Currency, OrderID, Quantity, BinanceConnection) => {
		console.log(PositionType, Currency, OrderID, BinanceConnection);
		var OrderType = '';
		var Options = {};

		// const OrderData = await Futures.OrderStatus(Currency, OrderID, BinanceConnection);
		// console.log(OrderData, 'OrderData');
		var Quantity = parseFloat(Quantity);
		Quantity = Quantity.toFixed(FuturesEXData[Currency].QuantityPrecision);

		console.log(Quantity, 'Quantity');

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

		var OrderStatus = await BinanceConnection[OrderType](Currency, Number(Quantity), Options);

		console.log(OrderStatus, 'ClosePosition OrderStatus');

		return OrderStatus;
	}
};

exports.Futures = Futures;
