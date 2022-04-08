const DataBaseQuery = require('../../database/database-query').DatabaseQuery;
const Trade = require('../../trade/trade').EXBTrade;

var SignalsImport = SignalsImport || {};

SignalsImport = {
	CheckDuplicatedSignals: async (SignalsID) => {
		try {
			const DuplicatedSignals = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys: 'ChatID',
					SelectOptions: {},
					Where: {
						ChatID: SignalsID
					}
				}
			});

			const ChatsID = DuplicatedSignals[1].map((DSItem) => {
				return DSItem.ChatID;
			});

			return ChatsID;
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	},

	CheckRepeatedSignals: async (SignalsDuplicatedQuery) => {
		try {
			// if (!SignalsDuplicatedQuery.length) return;

			const DuplicatedSignals = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-signals',
					SelectKeys: 'ChatID',
					SelectOptions: {},
					Where: SignalsDuplicatedQuery
				}
			});

			return DuplicatedSignals[1].length;
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	},

	InsertSignals: async (NewSignals) => {
		try {
			const InsertStatus = await DataBaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'InsertMany',
				MethodData: {
					ModelName: 'exb-signals',
					InsertData: NewSignals
				}
			});

			return InsertStatus[0];
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	},

	AddSignals: async (Signals) => {
		// Signal item loop
		var SignalsChatID = Signals.map((SignalItem) => {
			return SignalItem.ChatID;
		});

		// Check duplicated signals
		const DuplicatedChatID = await SignalsImport.CheckDuplicatedSignals(SignalsChatID);

		var NewSignals = Signals.filter((Signal) => {
			if (DuplicatedChatID.indexOf(Signal.ChatID) === -1) return Signal;
		});

		for (let i = 0; i < NewSignals.length; i++) {
			if (
				await SignalsImport.CheckRepeatedSignals({
					ExchangeType: NewSignals[i].ExchangeType,
					Currency: NewSignals[i].Currency,
					EnterPrice: NewSignals[i].EnterPrice,
					SignalDate: { $gt: new Date(new Date(Date.now()).getTime() - 1000 * 60 * 1080) }
				})
			)
				NewSignals.splice(i, 1);
		}

		// Signal item loop
		// var SignalsDuplicatedQuery = Signals.map(async (SignalItem, SignalIndex) => {
		//     // return {
		//     //     ExchangeType: SignalItem.ExchangeType,
		//     //     Currency: SignalItem.Currency,
		//     //     EnterPrice: SignalItem.EnterPrice
		//     // };
		// });

		// const RepeatedSignals = await SignalsImport.CheckRepeatedSignals(SignalsDuplicatedQuery);

		// const UniqueSignals = NewSignals.filter((Signal) => {
		//     if (RepeatedSignals.indexOf(Signal.ChatID) === -1) return Signal;
		// });

		// NewSignals.map((SignalReady) => {
		// Send for trade
		// console.log('Send for trade!');
		Trade.ReadyForTrade(NewSignals);
		// });

		// Insert new signals into the database
		if (NewSignals.length) {
			// uncomment
			return await SignalsImport.InsertSignals(NewSignals);
		}

		return true;
	}
};

exports.SignalsImport = SignalsImport;
