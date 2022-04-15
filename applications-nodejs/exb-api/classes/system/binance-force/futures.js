var Futures = Futures || {};

Futures = {
	OrderStatus: async (Currency, OrderID) => {
		return await global.BinanceAPI.futuresOrderStatus(Currency, { orderId: OrderID });
	},

	CancelOrder: async (Currency, OrderID) => {
		return await global.BinanceAPI.futuresCancel(Currency, { orderId: OrderID });
	},

	ClosePosition: async (PositionType, Currency, OrderID) => {
		var OrderType = '';
		var Options = {};

		const OrderData = await Futures.OrderStatus(Currency, OrderID);
		var Quantity = parseFloat(OrderData.origQty);

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

		return await global.BinanceAPI[OrderType](Currency, Quantity, Options);
	}
};

exports.Futures = Futures;
