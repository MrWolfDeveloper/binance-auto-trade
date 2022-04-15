const FS = require('fs');

const DatabaseQuery = require(`${__dirname}/../../database/database-query.js`).DatabaseQuery;

var User = User || {};

User = {
	GetUser: async (Filter, SelectKeys) => {
		try {
			// User status must be active.
			Filter.Status = 'active';

			const Users = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-system-users',
					SelectKeys: SelectKeys,
					SelectOptions: {},
					Where: Filter
				}
			});

			return Users[1];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	GetTradeUsers: async (Filter, SelectKeys) => {
		try {
			const Users = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: SelectKeys,
					SelectOptions: {},
					Where: Filter
				}
			});

			return Users[1];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	GetUserByChatID: async (ChatID) => {
		try {
			var UsersList = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'Username ExchangesData Signals',
					SelectOptions: {},
					Where: {}
				}
			});

			var NewUserList = UsersList[1].map((User) => {
				var UserSignalData = User.Signals.map((UserSignal) => {
					if (UserSignal.SignalChatID != ChatID) return;

					if (UserSignal.PositionStatus != 'stoploss' || UserSignal.PositionStatus != 'take_profit')
						return UserSignal;
				});

				UserSignalData = UserSignalData.filter(function(Element) {
					return Element != null;
				});

				if (!UserSignalData.length) return;

				return {
					Username: User.Username,
					ExchangesData: User.ExchangesData,
					Signals: UserSignalData
				};
			});

			NewUserList = NewUserList.filter(function(Element) {
				return Element != null;
			});

			return NewUserList;
		} catch (ReturnError) {
			console.error(ReturnError);

			return [];
		}
	},

	AddSystemUser: async (InsertData) => {
		try {
			const InsertStatus = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'InsertMany',
				MethodData: {
					ModelName: 'exb-system-users',
					InsertData: InsertData
				}
			});

			return InsertStatus[0];
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	},

	AddUser: async (UserData) => {
		try {
			const PlanDataFile = JSON.parse(
				FS.readFileSync(`${__dirname}/../../../storage/subscription-plans.json`, 'utf8')
			);

			console.log(PlanDataFile);

			const PlanData = PlanDataFile[UserData.PlanID];

			const PlanStartDate = new Date(Date.now());
			const PlanEndDate = new Date(
				new Date(Date.now()).setDate(new Date(Date.now()).getDate() + PlanData.DurationDay)
			);

			var NewAccountStatus;

			if (UserData.PlanID === 'free') {
				NewAccountStatus = 'free-plan';
				var UseFreePlan = true;
			} else {
				NewAccountStatus = 'monetary-plan';
				var UseFreePlan = false;
			}

			const InsertData = {
				Username: UserData.Username,
				Email: UserData.Email,
				PhoneNumber: UserData.PhoneNumber,
				AccountStatus: NewAccountStatus,
				UseFreePlan: UseFreePlan,
				ExchangesData: {
					Binance: {
						APIKey: UserData.ExchangesData.Binance.APIKey,
						APISecret: UserData.ExchangesData.Binance.APISecret,
						VeryHighRiskSignal: true,
						SpotCeilingAmount: {
							USDT: PlanData.ExchangesData.SpotCeilingAmount.USDT,
							BTC: PlanData.ExchangesData.SpotCeilingAmount.BTC
						},
						FuturesCeilingAmount: {
							USDT: PlanData.ExchangesData.FuturesCeilingAmount.USDT
						}
					}
				},
				SubscriptionData: {
					TXID: 'panel',
					PlanID: UserData.PlanID,
					PlanStartDate: PlanStartDate,
					PlanEndDate: PlanEndDate
				},
				TradeSpan: {
					Binance: {
						SpotUSDT: PlanData.TradeSpan.SpotUSDT,
						SpotBTC: PlanData.TradeSpan.SpotBTC,
						Futures: PlanData.TradeSpan.Futures
					}
				}
			};

			const InsertStatus = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'InsertMany',
				MethodData: {
					ModelName: 'exb-users',
					InsertData: InsertData
				}
			});

			return InsertStatus[0];
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	},

	DeleteUser: async (Username) => {
		try {
			const DropStatus = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Drop',
				MethodData: {
					ModelName: 'exb-users',
					Which: {
						Username: Username
					}
				}
			});

			return DropStatus;
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	},

	UpdateUser: async (Username, NewData) => {
		try {
			const UpdateStatus = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: NewData
					},
					Which: {
						Username: Username
					}
				}
			});

			return UpdateStatus;
		} catch (DatabaseError) {
			throw new Error(DatabaseError);
		}
	}
};

exports.User = User;
