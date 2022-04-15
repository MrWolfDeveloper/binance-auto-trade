const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;

var Signals = Signals || {};

Signals = {
	PublicHistory: async () => {
		try {
			const SignalsList = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys:
						'ExchangeType Currency EnterPrice EntryPrice Targets OpenTargets DoneTargets Capital StopLoss ForceStop PositionStatus SignalDate PositionDate StopLossHitDate',
					SelectOptions: {},
					Where: {
						PositionStatus: {
							$regex: '(?:^|W)(take_profit|stoploss|forcestop|target-(.*))(?:$|W)',
							$options: 'i'
						}
					}
				}
			});

			var StructuredSignals = SignalsList[1].map((SignalItem) => {
				// console.log(SignalItem);
				/* ------------------------------ Exchange type ----------------------------- */
				var Exchange = SignalItem.ExchangeType[0].replace('-', ' ').toUpperCase();

				if (typeof SignalItem.ExchangeType[1] != 'undefined')
					Exchange = `${Exchange} (${SignalItem.ExchangeType[1].toUpperCase()})`;

				var Currency = `${SignalItem.Currency[0]} / ${SignalItem.Currency[1]}`;

				/* -------------------------------- Stoploss -------------------------------- */
				var Stoploss = '';

				if (SignalItem.PositionStatus === 'take_profit' || SignalItem.PositionStatus === 'stoploss') {
					if (SignalItem.ExchangeType[0] === 'binance-futures') {
						var DoneTargets;

						// Sort done targets
						if (SignalItem.ExchangeType[1] === 'long')
							DoneTargets = SignalItem.DoneTargets.sort(
								(a, b) => parseFloat(a.Target) - parseFloat(b.Target)
							);
						else if (SignalItem.ExchangeType[1] === 'short')
							DoneTargets = SignalItem.DoneTargets.sort(
								(a, b) => parseFloat(b.Target) - parseFloat(a.Target)
							);

						if (DoneTargets.length) {
							if (DoneTargets.length === 1) Stoploss = SignalItem.StopLoss.Number;
							else if (DoneTargets.length === 2) Stoploss = SignalItem.EntryPrice;
							else Stoploss = DoneTargets[DoneTargets.length - 3].Target;
						} else Stoploss = SignalItem.StopLoss.Number;
					}

					if (SignalItem.ExchangeType[0] === 'binance-spot') {
						if (SignalItem.StopLoss.Type === 'normal') {
							var DoneTargets;

							// Sort done targets
							DoneTargets = SignalItem.DoneTargets.sort(
								(a, b) => parseFloat(a.Target) - parseFloat(b.Target)
							);

							if (DoneTargets.length) {
								if (DoneTargets.length === 1) Stoploss = SignalItem.StopLoss.Number;
								else if (DoneTargets.length === 2) Stoploss = SignalItem.EntryPrice;
								else Stoploss = DoneTargets[DoneTargets.length - 3].Target;
							} else Stoploss = SignalItem.StopLoss.Number;
						} else if (SignalItem.StopLoss.Type === 'manual')
							Stoploss = `[CANDLE STOPLOSS] ${SignalItem.StopLoss.CandleInterval} candle ${SignalItem
								.StopLoss.CandleSide} ${SignalItem.StopLoss.Number}`;
					}
				} else {
					Stoploss = 'not-hit';
				}

				console.log(Stoploss, 'StoplossStoploss');

				/* --------------------------------- Capital -------------------------------- */
				var Capital = `${SignalItem.Capital.Percentage}%`;

				/* --------------------------------- Targets -------------------------------- */
				var Targets = [];

				if (SignalItem.PositionStatus === 'stoploss' || SignalItem.PositionStatus === 'forcestop') {
					Targets = SignalItem.Targets.map((Target) => {
						var FilterDN = SignalItem.DoneTargets.filter(
							(Item) => parseFloat(Target) === parseFloat(Item.Target)
						);

						if (FilterDN.length) return { Target: Target, HitDate: FilterDN[0].HitDate };
						return Target;
					});

					if (typeof SignalItem.OpenTargets[0] != 'undefined') {
						var FilterDN = SignalItem.DoneTargets.filter(
							(Item) => parseFloat(SignalItem.OpenTargets[0]) === parseFloat(Item.Target)
						);

						if (FilterDN.length) return { Target: SignalItem.OpenTargets[0], HitDate: FilterDN[0].HitDate };
						else Targets.push(SignalItem.OpenTargets[0]);
					}
				} else if (SignalItem.PositionStatus === 'take_profit') {
					Targets = SignalItem.Targets.map((Target) => {
						var FilterDN = SignalItem.DoneTargets.filter(
							(Item) => parseFloat(Target) === parseFloat(Item.Target)
						);

						if (FilterDN.length) return { Target: Target, HitDate: FilterDN[0].HitDate };
						return Target;
					});

					if (typeof SignalItem.OpenTargets[0] != 'undefined')
						Targets.push({ Target: SignalItem.OpenTargets[0], HitDate: new Date(Date.now()) });
				} else if (/(?:^|W)(target-(.*))(?:$|W)/i.test(SignalItem.PositionStatus)) {
					let TargetArray = SignalItem.PositionStatus.split('-');

					let TargetHited = parseInt(TargetArray[1]);

					Targets = SignalItem.Targets;
					var NewTargets = Targets.splice(0, TargetHited);

					var Targets = NewTargets.map((Target) => {
						var FilterDN = SignalItem.DoneTargets.filter(
							(Item) => parseFloat(Target) === parseFloat(Item.Target)
						);

						if (FilterDN.length) return { Target: Target, HitDate: FilterDN[0].HitDate };
						return Target;
					});
				}

				var EntryPrice = (parseFloat(SignalItem.EnterPrice[0]) + parseFloat(SignalItem.EnterPrice[1])) / 2;

				var TargetCount = SignalItem.Targets.length;
				if (typeof SignalItem.OpenTargets[0] != 'undefined') TargetCount = TargetCount + 1;

				var ReturnData = {
					Exchange: Exchange,
					Currency: Currency,
					EntryPrice: SignalItem.EntryPrice,
					Targets: Targets,
					TargetCount: TargetCount,
					SignalDate: SignalItem.SignalDate,
					Capital: Capital,
					StopLoss: Stoploss,
					ForceStop: SignalItem.ForceStop,
					PositionStatus: SignalItem.PositionStatus
				};

				// Add leverage if is futures
				if (SignalItem.ExchangeType[0] === 'binance-futures')
					ReturnData = {
						...ReturnData,
						Leverage: `${SignalItem.Capital.Range[
							SignalItem.Capital.Range.length - 1
						]}X (${SignalItem.Capital.Leverage.toUpperCase()})`
					};

				// Add stoploss hit date
				if (SignalItem.PositionStatus === 'stoploss') {
					ReturnData = { ...ReturnData, StoplossHitDate: SignalItem._doc.StopLossHitDate };
				}

				return ReturnData;
			});

			return StructuredSignals;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}
};

exports.Signals = Signals;
