const FS = require('fs');

const DataBaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;

var FakeSignals = FakeSignals || {};

FakeSignals = {
	Status: [ 'take_profit', 'stoploss', 'open', 'opening', 'target', 'forcestop' ],

	AddNewSignals: async () => {
		const NewSignals = JSON.parse(FS.readFileSync(`${__dirname}/all.json`));

		// NewSignals.map(async () => {
		try {
			const InsertStatus = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'InsertMany',
				MethodData: {
					ModelName: 'exb-signals',
					InsertData: NewSignals
				}
			});

			console.log(InsertStatus);
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
		// });
	},

	AddNewSignalsToUser: async () => {
		const NewSignals = JSON.parse(FS.readFileSync(`${__dirname}/all-short.json`));

		NewSignals.map(async (Signal) => {
			try {
				// const InsertStatus = await DataBaseQuery.AsyncMakeDatabaseQuery({
				// 	DBQueryMethod: 'InsertMany',
				// 	MethodData: {
				// 		ModelName: 'exb-signals',
				// 		InsertData: NewSignals
				// 	}
				// });
				// console.log(InsertStatus);

				var DoneTargets = FakeSignals.GenerateDoneTargets(
					Signal.ExchangeType[0],
					Signal.Targets,
					Signal.StopLoss,
					Signal.PositionStatus
				);

				var AddData;
				if (Signal.ExchangeType[0] === 'binance-futures') {
					AddData = {
						SignalChatID: Signal.ChatID,
						SignalEntryDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now())),
						EnterPrice: Signal.EnterPrice,
						ExchangeType: Signal.ExchangeType,
						Currency: Signal.Currency,
						DoneTargets: DoneTargets.DoneTargets,
						Capital: Signal.Capital,
						Leverage: Signal.Capital.Range[Signal.Capital.Range.length - 1],
						PositionStatus: Signal.PositionStatus,
						Quantity: DoneTargets.SumQuantity,
						EntryPrice: Signal.EntryPrice,
						StopLoss: Signal.StopLoss,
						PositionOrderID: FakeSignals.GenerateRandomID(),
						ForceStop: Signal.ForceStop
					};

					if (Signal.PositionStatus === 'stoploss')
						AddData = {
							...AddData,
							StoplossHitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
						};
				} else if (Signal.ExchangeType[0] === 'binance-spot') {
					AddData = {
						SignalChatID: Signal.ChatID,
						SignalEntryDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now())),
						EnterPrice: Signal.EnterPrice,
						ExchangeType: Signal.ExchangeType,
						Currency: Signal.Currency,
						DoneTargets: DoneTargets.DoneTargets,
						Capital: Signal.Capital,
						PositionStatus: Signal.PositionStatus,
						Quantity: DoneTargets.SumQuantity,
						EntryPrice: Signal.EntryPrice,
						StopLoss: Signal.StopLoss,
						PositionOrderID: FakeSignals.GenerateRandomID(),
						ForceStop: Signal.ForceStop
					};

					if (Signal.PositionStatus === 'stoploss')
						AddData = {
							...AddData,
							StoplossHitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
						};
				}

				// if (AddData.SignalChatID === 'rs-5677') console.log(AddData, AddData);

				const UpdateDataBaseResult = await DataBaseQuery.AsyncMakeDatabaseQuery({
					DBQueryMethod: 'Update',
					MethodData: {
						ModelName: 'exb-users',
						MongooseUMO: { multi: false },
						NewData: {
							$push: {
								Signals: AddData
							}
						},
						Which: {
							Username: 'donooko'
						}
					}
				});

				console.log(UpdateDataBaseResult);
			} catch (ReturnError) {
				throw new Error(ReturnError);
			}
		});
	},

	// CapitalizeFirstLetter: (Text) => {
	// 	return Text.charAt(0).toUpperCase() + Text.slice(1);
	// },

	GenerateRandomID: () => {
		return parseInt(Math.random() * 1000000000);
	},

	GenerateDoneTargets: (ExchangeType, Targets, Stoploss, PositionStatus) => {
		var NewTargets;
		var SumQuantity = 0;

		if (ExchangeType === 'binance-futures') {
			NewTargets = Targets.map((Target) => {
				var Hit;
				var Type = 'take_profit';

				if (Target.HitDate === 'not-set') Hit = false;
				else Hit = true;

				let OrderQuantity = Target.Target * 0.1;

				// console.log(OrderQuantity, 'OrderQuantity');

				// Sum all orders quantity
				SumQuantity += parseFloat(OrderQuantity);

				// console.log(SumQuantity, 'SumQuantity');

				var ReturnData = {
					OrderID: FakeSignals.GenerateRandomID(),
					TargetCreationDate: new Date(Date.now()),
					Price: Target.Target,
					OrderQuantity: OrderQuantity,
					Hit: Hit,
					Type: Type
				};

				if (Hit)
					ReturnData = {
						...ReturnData,
						HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
					};

				ReturnData = { ...ReturnData, OrderID: FakeSignals.GenerateRandomID() };

				return ReturnData;
			});

			var HitStoploss = false;
			if (PositionStatus === 'stoploss') HitStoploss = true;

			var StoplossOBJ = {
				OrderID: FakeSignals.GenerateRandomID(),
				TargetCreationDate: new Date(Date.now()),
				Price: Stoploss.Number,
				OrderQuantity: SumQuantity,
				Hit: HitStoploss,
				Type: 'stoploss'
			};

			if (HitStoploss)
				StoplossOBJ = {
					...StoplossOBJ,
					HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
				};

			NewTargets.push(StoplossOBJ);
		} else if (ExchangeType === 'binance-spot') {
			NewTargets = Targets.map((Target) => {
				var Type;
				var Hit;

				let OrderQuantity = Target.Target * 0.1;

				// console.log(OrderQuantity, 'OrderQuantity');

				// Sum all orders quantity
				SumQuantity += parseFloat(OrderQuantity);

				// console.log(SumQuantity, 'SumQuantity');

				if (Stoploss.Type === 'manual') Type = 'take_profit';
				else Type = 'oco_order';

				if (Target.HitDate === 'not-set') Hit = false;
				else Hit = true;

				var ReturnData = {
					OrderID: FakeSignals.GenerateRandomID(),
					TargetCreationDate: new Date(Date.now()),
					Price: Target.Target,
					OrderQuantity: OrderQuantity,
					Hit: Hit,
					Type: Type
				};

				if (Type === 'oco_order') {
					ReturnData = {
						OrderListID: FakeSignals.GenerateRandomID(),
						SLOrderID: FakeSignals.GenerateRandomID(),
						TPOrderID: FakeSignals.GenerateRandomID(),
						...ReturnData
					};
				} else {
					ReturnData = { ...ReturnData, OrderID: FakeSignals.GenerateRandomID() };
				}

				if (Hit)
					ReturnData = {
						...ReturnData,
						HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
					};

				return ReturnData;
			});
		}

		return { SumQuantity: SumQuantity, DoneTargets: NewTargets };
	},

	GetAllSignals: async () => {
		try {
			var AllSignals = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys:
						'ExchangeType Currency EnterPrice OpenTargets Targets SignalDate ChatID Capital StopLoss ForceStop PositionStatus StopLossHitDate',
					SelectOptions: {},
					Where: {}
				}
			});

			return AllSignals[1];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	RestructuredSignals: async () => {
		try {
			const AllSignals = await FakeSignals.GetAllSignals();

			var NewSignals = AllSignals.map((Signal) => {
				var {
					ExchangeType,
					Currency,
					EnterPrice,
					OpenTargets,
					Targets,
					SignalDate,
					ChatID,
					Capital,
					StopLoss
				} = Signal;

				Targets = [ ...Targets, ...OpenTargets ];

				EnterPrice = EnterPrice.map((EItem) => parseFloat(EItem));

				var NewData = FakeSignals.GenerateRandomStatus(Targets, EnterPrice);

				var AddData = {
					ExchangeType: ExchangeType,
					Currency: Currency,
					EnterPrice: EnterPrice,
					EntryPrice: (EnterPrice[0] + EnterPrice[1]) / 2,
					Targets: NewData.Targets,
					SignalDate: SignalDate,
					ChatID: ChatID,
					Capital: Capital,
					StopLoss: StopLoss
				};

				if (NewData.PositionStatus === 'stoploss') {
					AddData = {
						...AddData,
						...NewData,
						StopLossHitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
					};
				} else {
					var AddData = { ...AddData, ...NewData };
				}

				return AddData;
			});

			FS.writeFileSync(`${__dirname}/all.json`, JSON.stringify(NewSignals));
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	RandomDate: (StartDate, EndDate) => {
		return new Date(StartDate.getTime() + Math.random() * (EndDate.getTime() - StartDate.getTime()));
	},

	GenerateRandomStatus: (Targets, EnterPrice) => {
		var RandomStatus = FakeSignals.Status[Math.floor(Math.random() * FakeSignals.Status.length)];

		const RandomHitIndex = FakeSignals.RandomArbitrary(1, Targets.length);

		Targets = Targets.map((Target) => parseFloat(Target));

		var NewTargets = [];
		var ForceStopData;
		if (RandomStatus === 'target') {
			NewTargets = Targets.map((Target, TargetIndex) => {
				if (TargetIndex <= RandomHitIndex) {
					return {
						Target: Target,
						HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
					};
				} else {
					return { Target: Target, HitDate: 'not-set' };
				}
			});

			RandomStatus = `target-${RandomHitIndex}`;
		} else if (RandomStatus === 'stoploss') {
			NewTargets = Targets.map((Target, TargetIndex) => {
				if (TargetIndex <= RandomHitIndex) {
					return {
						Target: Target,
						HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
					};
				} else {
					return { Target: Target, HitDate: 'not-set' };
				}
			});
		} else if (RandomStatus === 'take_profit') {
			NewTargets = Targets.map((Target, TargetIndex) => {
				return { Target: Target, HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now())) };
			});
		} else if (RandomStatus === 'forcestop') {
			NewTargets = Targets.map((Target, TargetIndex) => {
				if (TargetIndex <= RandomHitIndex) {
					return {
						Target: Target,
						HitDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
					};
				} else {
					return { Target: Target, HitDate: 'not-set' };
				}
			});

			ForceStopData = {
				ClosePrice: FakeSignals.RandomArbitrary(EnterPrice[0], EnterPrice[1]),
				CloseDate: FakeSignals.RandomDate(new Date(2021, 0, 1), new Date(Date.now()))
			};
		} else {
			NewTargets = Targets.map((Target, TargetIndex) => {
				return { Target: Target, HitDate: 'not-set' };
			});
		}

		if (RandomStatus === 'forcestop')
			return { ForceStop: ForceStopData, PositionStatus: RandomStatus, Targets: NewTargets };

		return { PositionStatus: RandomStatus, Targets: NewTargets };
	},

	RandomArbitrary: (Min, Max) => {
		return parseInt(Math.random() * (Max - Min) + Min);
	}
};

exports.FakeSignals = FakeSignals;
