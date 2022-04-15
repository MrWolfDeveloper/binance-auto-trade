const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;
const UserData = require(`${__dirname}/user-data.js`).UserData;

const SPData = require(`${__dirname}/../../storage/subscription-plans.json`);

var Plan = Plan || {};

Plan = {
	ValidatePlanID: (PlanID) => {
		if (typeof SPData[PlanID] === 'undefined') return false;

		return true;
	},

	AddPlanToUser: async (Username, TXID, PlanID, APIKey, APISecret) => {
		const PlanData = SPData[PlanID];

		const PlanStartDate = new Date(Date.now());
		const PlanEndDate = new Date(
			new Date(Date.now()).setDate(new Date(Date.now()).getDate() + PlanData.DurationDay)
		);

		var NewAccountStatus;

		if (PlanID === 'free') NewAccountStatus = 'free-plan';
		else NewAccountStatus = 'monetary-plan';

		const UpdateData = {
			AccountStatus: NewAccountStatus,
			ExchangesData: {
				Binance: {
					APIKey: APIKey,
					APISecret: APISecret,
					VeryHighRiskSignal: true,
					SmartStoploss: true,
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
				TXID: TXID,
				PlanID: PlanID,
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

		// This function just update binance exchange
		try {
			/* ---------------------------- Check item in database --------------------------- */
			const UpdateDatabaseResult = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Update',
				MethodData: {
					ModelName: 'exb-users',
					MongooseUMO: { multi: false },
					NewData: {
						$set: UpdateData
					},
					Which: {
						Username: Username
					}
				}
			});

			// Update user balances
			await UserData.UpdateUserBalances(Username);

			return UpdateDatabaseResult[0];
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}
};

exports.Plan = Plan;
