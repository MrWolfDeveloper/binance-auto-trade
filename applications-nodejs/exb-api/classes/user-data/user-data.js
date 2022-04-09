const Binance = require('node-binance-api');

const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;

const SubscriptionPlans = require(`${__dirname}/../../storage/subscription-plans.json`);

var UserData = UserData || {};

UserData = {
	AddNewUser: async (Data) => {
		try {
			const UserInsert = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'InsertMany',
				MethodData: {
					ModelName: 'exb-users',
					InsertData: Data
				}
			});

			if (!UserInsert[0]) return false;

			return true;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	CheckDuplicate: async (Where) => {
		try {
			/* ---------------------------- Check item in database --------------------------- */
			const DatabaseCheckDuplicate = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: '_id',
					SelectOptions: {},
					Where: Where
				}
			});

			/* --------------------------- Duplicate item --------------------------- */
			if (DatabaseCheckDuplicate[1].length) return false;

			return true;
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

			return UserInfo[1];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	UpdateAPIData: async (Username, Exchange, APIKey, APISecret) => {
		var UpdateData;
		if (Exchange === 'binance') {
			UpdateData = {
				Binance: {
					APIKey: APIKey,
					APISecret: APISecret
				}
			};
		}

		try {
			/* ---------------------------- Check item in database --------------------------- */
			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: {
							ExchangesData: UpdateData
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

	ChangeUserTradeCeiling: async (Username, NewData) => {
		try {
			var UserInfo = await UserData.GetUserInfo(Username, 'SubscriptionData ExchangesData');

			const UserPlanID = UserInfo[0].SubscriptionData.PlanID;
			const PlanData = SubscriptionPlans[UserPlanID];

			console.log(UserInfo, 'UserInfo');

			// Check spot USDT ceiling amount
			if (parseFloat(NewData.Binance.Spot.USDT) > PlanData.ExchangesData.SpotCeilingAmount.USDT) return -2010;

			// Check spot BTC ceiling amount
			if (parseFloat(NewData.Binance.Spot.BTC) > PlanData.ExchangesData.SpotCeilingAmount.BTC) return -2011;

			// Check futures USDT ceiling amount
			if (parseFloat(NewData.Binance.Futures.USDT) > PlanData.ExchangesData.FuturesCeilingAmount.USDT)
				return -2012;

			// Update data
			UserInfo[0].ExchangesData.Binance.SpotCeilingAmount.USDT = parseFloat(NewData.Binance.Spot.USDT);
			UserInfo[0].ExchangesData.Binance.SpotCeilingAmount.BTC = parseFloat(NewData.Binance.Spot.BTC);
			UserInfo[0].ExchangesData.Binance.FuturesCeilingAmount.USDT = parseFloat(NewData.Binance.Futures.USDT);

			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: {
							ExchangesData: UserInfo[0].ExchangesData
						}
					},
					Which: {
						Username: Username
					}
				}
			});

			return 200;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	ChangeUserSmartStoplossStatus: async (Username, SmartStoplossStatus) => {
		try {
			var UserInfo = await UserData.GetUserInfo(Username, 'ExchangesData');

			// Smart stoploss status
			UserInfo[0].ExchangesData.Binance.SmartStoploss = SmartStoplossStatus;

			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: {
							ExchangesData: UserInfo[0].ExchangesData
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

	UpdateUserBalances: async (Username) => {
		try {
			var UserInfo = await UserData.GetUserInfo(Username, 'ExchangesData');

			var UserBinance = new Binance().options({
				APIKEY: UserInfo[0].ExchangesData.Binance.APIKey,
				APISECRET: UserInfo[0].ExchangesData.Binance.APISecret
			});

			return new Promise((Resolve, Reject) => {
				UserBinance.balance(async (ReturnError, SpotBalances) => {
					if (ReturnError) {
						console.log(ReturnError, 'ReturnError');
						Reject(ReturnError);
					}

					console.log(SpotBalances, Username, 'SpotBalances');

					const RequireSpotBalances = {
						BTC: parseFloat(SpotBalances.BTC.available) + parseFloat(SpotBalances.BTC.onOrder),
						USDT: parseFloat(SpotBalances.USDT.available) + parseFloat(SpotBalances.USDT.onOrder)
					};

					var FuturesBalances = await UserBinance.futuresBalance();
					FuturesBalances = FuturesBalances.filter((FBAsset) => FBAsset.asset === 'USDT');

					const RequireFuturesBalances = {
						USDT: parseFloat(FuturesBalances[0].balance)
					};

					// Update keys
					UserInfo[0].ExchangesData.Binance.Balances.Spot = RequireSpotBalances;
					UserInfo[0].ExchangesData.Binance.Balances.Futures = RequireFuturesBalances;

					const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
						DBQueryMethod: 'Update',
						MethodData: {
							ModelName: 'exb-users',
							MongooseUMO: { multi: false },
							NewData: {
								$set: {
									ExchangesData: UserInfo[0].ExchangesData
								},
								$push: {
									WalletBalanceHistory: {
										Date: new Date(Date.now()),
										Spot: RequireSpotBalances,
										Futures: RequireFuturesBalances
									}
								}
							},
							Which: {
								Username: Username
							}
						}
					});

					Resolve(UpdateDatabaseResult[0]);
				});
			});
		} catch (ReturnError) {
			return false;
		}
	},

	UpdateAllUserBalances: async () => {
		try {
			const UsersList = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'Username',
					SelectOptions: {},
					Where: {}
				}
			});

			UsersList[1].map(async (UserItem, UserIndex) => {
				setTimeout(async () => {
					await UserData.UpdateUserBalances(UserItem.Username);
				}, 2000 * UserIndex);
			});
		} catch (ReturnError) {
			return false;
		}
	},

	GetUserBalances: async (Username) => {
		try {
			var UserInfo = await UserData.GetUserInfo(Username, 'ExchangesData');

			return UserInfo[0].ExchangesData.Binance.Balances;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	GetUserSumBalances: async (Username) => {
		try {
			const UserBalances = await UserData.GetUserBalances(Username);

			const BinanceOBJ = new Binance().options({
				APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
				APISECRET: 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM'
			});

			const AllPrices = await BinanceOBJ.prices();

			const BTCToUSDT = parseFloat(AllPrices.BTCUSDT) * parseFloat(UserBalances.Spot.BTC);

			return BTCToUSDT + parseFloat(UserBalances.Spot.USDT) + parseFloat(UserBalances.Futures.USDT);
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	UsedFreeSubscription: async (Username) => {
		try {
			const UserInfo = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'UseFreePlan',
					SelectOptions: {},
					Where: {
						Username: Username
					}
				}
			});

			return UserInfo[1][0].UseFreePlan;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	SubscriptionInUse: async (Username) => {
		try {
			const UserInfo = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-users',
					SelectKeys: 'SubscriptionData',
					SelectOptions: {},
					Where: {
						Username: Username
					}
				}
			});

			if (typeof UserInfo[1][0].SubscriptionData.PlanStartDate === 'undefined') return false;

			let Today = new Date(Date.now());
			if (
				Today.getTime() >= UserInfo[1][0].SubscriptionData.PlanEndDate.getTime() &&
				Today.getTime() <= UserInfo[1][0].SubscriptionData.PlanStartDate.getTime()
			)
				return false;

			return true;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},

	SetFreePlanUsed: async (Username) => {
		try {
			/* ---------------------------- Check item in database --------------------------- */
			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: {
							UseFreePlan: true
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
	}
};

exports.UserData = UserData;
