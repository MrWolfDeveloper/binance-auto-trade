const Binance = require('node-binance-api');
const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;

const ProxyHandler = require(`${__dirname}/../trade/proxy.js`).ProxyHandler;

var User = User || {};

User = {
	GetTradeUsers: async (ExchangeType, TradeType) => {
		var TradeSpanKey;
		if (ExchangeType === 'Spot') TradeSpanKey = `TradeSpan.Binance.${ExchangeType}${TradeType}`;
		if (ExchangeType === 'Futures') TradeSpanKey = `TradeSpan.Binance.${ExchangeType}`;

		var Where = {};
		Where[TradeSpanKey] = true;
		Where = { ...Where, ...{ $or: [ { AccountStatus: 'monetary-plan' }, { AccountStatus: 'free-plan' } ] } };

		try {
			const TradeUsers = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'Username ExchangesData SubscriptionData',
					SelectOptions: {},
					Where: Where
				}
			});

			const Today = new Date(Date.now());

			var FilterTradeUsers = TradeUsers[1].filter((UserItem) => {
				if (
					Today.getTime() <= UserItem.SubscriptionData.PlanEndDate.getTime() &&
					Today.getTime() >= UserItem.SubscriptionData.PlanStartDate.getTime()
				) {
					return UserItem;
				} else {
					User.ChangeAccountStatus(UserItem.Username, 'expired');
				}
			});

			return new Promise((Resolve) => {
				var FinalTradeUsers = FilterTradeUsers.map(async (UserItem) => {
					var ReturnProxy = await ProxyHandler.BestProxyIP();

					if (ExchangeType === 'Futures') {
						var BCOptions = {
							APIKEY: UserItem.ExchangesData.Binance.APIKey,
							APISECRET: UserItem.ExchangesData.Binance.APISecret,
							useServerTime: true,
							recvWindow: 60000,
							verbose: true,
							hedgeMode: true
							// proxy: ReturnProxy
						};
					} else if (ExchangeType === 'Spot') {
						var BCOptions = {
							APIKEY: UserItem.ExchangesData.Binance.APIKey,
							APISECRET: UserItem.ExchangesData.Binance.APISecret,
							useServerTime: true,
							recvWindow: 60000,
							verbose: true
							// proxy: ReturnProxy
						};
					}

					return {
						BinanceConnection: new Binance().options(BCOptions),
						ExchangesData: { Binance: UserItem.ExchangesData.Binance },
						Username: UserItem.Username
					};
				});

				Promise.all(FinalTradeUsers).then((FinalTradeUsers) => {
					Resolve(User.SplitToChunks(FinalTradeUsers, 3));
				});
			});
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	SplitToChunks: (UserList, ChunkSize) => {
		return [].concat.apply(
			[],
			UserList.map(function(Element, i) {
				return i % ChunkSize ? [] : [ UserList.slice(i, i + ChunkSize) ];
			})
		);
	},

	ChangeAccountStatus: async (Username, NewStatus) => {
		try {
			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: {
							AccountStatus: NewStatus
						}
					},
					Which: {
						Username: Username
					}
				}
			});

			return UpdateDatabaseResult[0];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	AddSignalToUser: async (Username, Signal) => {
		try {
			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$push: {
							Signals: Signal
						}
					},
					Which: {
						Username: Username
					}
				}
			});
		} catch (ReturnError) {
			// 	console.log(ReturnError, 'fffff');
			// 	throw new Error(ReturnError);
		}
	},

	GetSignalFromAllUser: async (ChatID) => {
		return new Promise(async (Resolve, Reject) => {
			const UsersList = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'Username',
					SelectOptions: {},
					Where: {}
				}
			});

			var Signals = [];

			UsersList[1].map(async (Username, Index) => {
				var UserSignals = await User.GetUserSignal(Username.Username, ChatID, 'Signals');

				Signals.push({ Username: Username.Username, Signal: UserSignals });

				if (Index === UsersList[1].length - 1) {
					var FilteredSignalData = Signals.filter((SignalData) => typeof SignalData.Signal != 'undefined');

					Resolve(FilteredSignalData);
				}
			});
		});
	},

	// Update: async (WhichQuery, UpdateQuery) => {
	// 	try {
	// 		const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
	// 			DBQueryMethod: 'Update',
	// 			MethodData: {
	// 				ModelName: 'exb-users',
	// 				MongooseUMO: { multi: false },
	// 				NewData: UpdateQuery,
	// 				Which: WhichQuery
	// 			}
	// 		});

	// 		return UpdateDatabaseResult;
	// 	} catch (ReturnError) {
	// 		throw new Error(ReturnError);
	// 	}
	// },

	GetUserSignal: async (Username, ChatID, SelectKeys) => {
		try {
			const UserInfo = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: SelectKeys,
					SelectOptions: {},
					Where: {
						Username: Username
					}
				}
			});

			var RequestedSignal = UserInfo[1][0].Signals.filter((Signal) => Signal.SignalChatID === ChatID);

			return RequestedSignal[0];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	GetUserInfo: async (Username, SelectKeys) => {
		try {
			/* ---------------------------- Check item in database --------------------------- */
			const UserInfo = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: SelectKeys,
					SelectOptions: {},
					Where: {
						Username: Username
					}
				}
			});

			/* --------------------------- Duplicate item --------------------------- */
			return UserInfo[1];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	UpdateUserSignal: async (Username, SignalChatID, UpdateQuery, Where = null) => {
		try {
			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: UpdateQuery,
					Which: {
						Username: Username,
						'Signals.SignalChatID': SignalChatID
					}
				}
			});

			return UpdateDatabaseResult;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}
};

exports.User = User;
