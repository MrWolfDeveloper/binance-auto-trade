const UserData = require(`${__dirname}/../classes/user-data/user-data.js`).UserData;
const Signals = require(`${__dirname}/../classes/signals/signals.js`).Signals;
const Validate = require(`${__dirname}/../classes/validate/validate.js`).Validate;

const FuturesEXData = require('../../../storage/exchange-data/symbol-data-futures.json');
const SpotEXData = require('../../../storage/exchange-data/symbol-data-spot.json');

const Express = require('express');
const Router = Express.Router();

const ToFixed = (Number, Fixed) => {
	try {
		// var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
		// return Number.toString().match(Regex)[0];
		return parseFloat(Number).toFixed(Fixed);
	} catch (ReturnError) {
		return 0;
	}
};

Router.get('/signal/history/:Username', async (Request, Response) => {
	const { Username } = Request.params;

	try {
		const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
			{ VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } }
		]);

		// Invalid username format
		if (DataValidate[1].length)
			return Response.status(422).json({
				code: -2014,
				fields: DataValidate[1]
			});

		var UserSignals = await UserData.GetUserInfo(Username, 'Signals');

		var RestructuredSignals = UserSignals[0].Signals.map((Signal) => {
			// console.log(Signal, 'Signal');
			var ReturnData = {
				SignalChatID: Signal._doc.SignalChatID,
				SignalEntryDate: Signal._doc.SignalEntryDate,
				ExchangeType: Signal._doc.ExchangeType,
				Currency: Signal._doc.Currency,
				DoneTargets: Signal._doc.DoneTargets,
				Capital: `${Signal._doc.Capital.Percentage}%`,
				PositionStatus: Signal._doc.PositionStatus,
				Quantity: Signal._doc.Quantity,
				EntryPrice: Signal._doc.EntryPrice,
				ForceStop: Signal._doc.ForceStop
			};

			// Fix quantity and price number
			var QuantityPrecision;
			var PricePrecision;
			if (Signal._doc.ExchangeType[0] === 'binance-futures') {
				console.log(ReturnData.Currency.toString().replace(',', ''), 'ReturnData.Currency.toString()');
				var QuantityPrecision =
					FuturesEXData[ReturnData.Currency.toString().replace(',', '')].QuantityPrecision;
				var PricePrecision = FuturesEXData[ReturnData.Currency.toString().replace(',', '')].PricePrecision;
			} else if (Signal._doc.ExchangeType[0] === 'binance-spot') {
				var QuantityPrecision = SpotEXData[ReturnData.Currency.toString().replace(',', '')].QuantityPrecision;
				var PricePrecision = SpotEXData[ReturnData.Currency.toString().replace(',', '')].PricePrecision;
			}

			// Fix numbers
			ReturnData.Quantity = ToFixed(ReturnData.Quantity, QuantityPrecision);
			ReturnData.EntryPrice = ToFixed(ReturnData.EntryPrice, PricePrecision);

			if (typeof ReturnData.ForceStop != 'undefined' && typeof ReturnData.ForceStop.ClosePrice != 'undefined')
				ReturnData.ForceStop.ClosePrice = ToFixed(ReturnData.ForceStop.ClosePrice, PricePrecision);

			var NewDN = ReturnData.DoneTargets.map((DN) => {
				DN.OrderQuantity = ToFixed(DN.OrderQuantity, QuantityPrecision);
				DN.Price = ToFixed(DN.Price, PricePrecision);

				return DN;
			});

			ReturnData.DoneTargets = NewDN;

			if (Signal._doc.StopLoss.Type === 'manual') {
				ReturnData = {
					...ReturnData,
					StopLoss: {
						StopLossNumber: Signal._doc.StopLoss.Number,
						StopLossData: `[CANDLE STOPLOSS] ${Signal._doc.StopLoss.CandleInterval} Candle ${Signal._doc
							.StopLoss.CandleSide} ${Signal._doc.StopLoss.Number}`
					}
				};
			} else {
				var TrailStopLoss;

				// Sort done targets
				if (Signal.ExchangeType[0] === 'binance-futures') {
					if (Signal.ExchangeType[1] === 'long')
						Signal._doc.DoneTargets = Signal._doc.DoneTargets.sort(
							(a, b) => parseFloat(a.Price) - parseFloat(b.Price)
						);
					else if (Signal.ExchangeType[1] === 'short')
						Signal._doc.DoneTargets = Signal._doc.DoneTargets.sort(
							(a, b) => parseFloat(b.Price) - parseFloat(a.Price)
						);
				} else if (Signal.ExchangeType[0] === 'binance-spot') {
					Signal._doc.DoneTargets = Signal._doc.DoneTargets.sort(
						(a, b) => parseFloat(a.Price) - parseFloat(b.Price)
					);
				}

				if (Signal._doc.PositionStatus === 'open' || Signal._doc.PositionStatus === 'opening')
					TrailStopLoss = Signal._doc.StopLoss.Number;
				else if (Signal._doc.PositionStatus === 'stoploss' || Signal._doc.PositionStatus === 'forcestop') {
					var HitedDoneTargets = Signal._doc.DoneTargets.filter((DN) => DN.Hit === true);
					if (Signal._doc.Currency[0] === 'KEEP') {
						console.log(HitedDoneTargets.length, 'HitedDoneTargets');
					}

					if (!HitedDoneTargets.length || HitedDoneTargets.length === 1)
						TrailStopLoss = Signal._doc.StopLoss.Number;

					if (HitedDoneTargets.length === 2) TrailStopLoss = Signal._doc.EntryPrice;
					else if (HitedDoneTargets.length > 2) {
						TrailStopLoss = Signal._doc.DoneTargets[Signal._doc.DoneTargets.length - 3].Price;
					}
				} else if (Signal._doc.PositionStatus === 'take_profit') {
					if (Signal._doc.SignalChatID === 'rsf-847')
						console.log(Signal._doc.DoneTargets.length < 2, Signal._doc.SignalChatID, 'Here');

					if (Signal._doc.DoneTargets.length < 2) {
						TrailStopLoss = Signal._doc.StopLoss.Number;
					} else if (Signal._doc.DoneTargets.length === 2) TrailStopLoss = Signal._doc.EntryPrice;
					else {
						console.log(
							Signal._doc.DoneTargets[Signal._doc.DoneTargets.length - 3],
							'Signal._doc.DoneTargets[Signal._doc.DoneTargets.length - 3]',
							Signal._doc.SignalChatID
						);
						TrailStopLoss = Signal._doc.DoneTargets[Signal._doc.DoneTargets.length - 3].Price;
					}
				} else if (/target-(.*)/i.test(Signal._doc.PositionStatus)) {
					var PSArray = Signal._doc.PositionStatus.split('-');

					if (parseInt(PSArray[1]) === 1) TrailStopLoss = Signal._doc.StopLoss.Number;
					else if (parseInt(PSArray[1]) === 2) TrailStopLoss = Signal._doc.EntryPrice;
					else TrailStopLoss = Signal._doc.DoneTargets[Signal._doc.DoneTargets.length - 3].Price;

					console.log(TrailStopLoss);
				}

				// console.log(ReturnData.Currency.toString());

				// console.log(ReturnData.Currency.toString(), TrailStopLoss, QuantityPrecision, ReturnData.SignalChatID);

				TrailStopLoss = ToFixed(TrailStopLoss, PricePrecision);

				ReturnData = {
					...ReturnData,
					StopLoss: {
						StopLossNumber: TrailStopLoss,
						StopLossData: ''
					}
				};
			}

			if (Signal.ExchangeType[0] === 'binance-futures') {
				ReturnData = {
					...ReturnData,
					Leverage: `${Signal._doc.Capital.Range[
						Signal._doc.Capital.Range.length - 1
					]}X (${Signal._doc.Capital.Leverage.toUpperCase()})`
				};
			}

			if (Signal.PositionStatus === 'stoploss') {
				ReturnData = { ...ReturnData, StoplossHitDate: Signal._doc.StoplossHitDate };
			}

			var DoneTargetsWithoutStoploss = ReturnData.DoneTargets.filter((DN) => DN.Type != 'stoploss');

			ReturnData.DoneTargets = DoneTargetsWithoutStoploss;

			return ReturnData;
		});

		return Response.status(200).json({ code: 200, signals: RestructuredSignals });
	} catch (ReturnError) {
		console.error(ReturnError, 'GET /signal/history/:Username');

		return Response.status(403).json({ code: -2015 });
	}
});

Router.get('/signal/public-history', async (Request, Response) => {
	try {
		var SignalsList = await Signals.PublicHistory();

		return Response.status(200).json({ code: 200, signals: SignalsList });
	} catch (ReturnError) {
		console.error(ReturnError, 'GET /signal/history/:Username');

		return Response.status(403).json({ code: -2015 });
	}
});

module.exports = Router;
