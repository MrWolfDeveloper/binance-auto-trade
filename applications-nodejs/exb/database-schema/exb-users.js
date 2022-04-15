var Mongoose = require('mongoose');

var UsersSchema = new Mongoose.Schema({
	Username: { type: String, require: true, unique: true },
	AccountStatus: {
		type: String,
		require: true,
		default: 'unpaid',
		enum: [ 'unpaid', 'free-plan', 'monetary-plan', 'expired', 'banned-account' ]
	},
	Email: { type: String, require: true, unique: true },
	PhoneNumber: { type: String, require: true, unique: true },
	ExchangesData: {
		Binance: {
			APIKey: String,
			APISecret: String,
			VeryHighRiskSignal: Boolean,
			SpotCeilingAmount: {
				USDT: Number,
				BTC: Number
			},
			FuturesCeilingAmount: {
				USDT: Number
			}
		}
	},
	UseFreePlan: Boolean,
	SubscriptionData: {
		TXID: String,
		PlanID: String,
		PlanStartDate: Date,
		PlanEndDate: Date
	},
	TradeSpan: {
		Binance: {
			SpotUSDT: Boolean,
			SpotBTC: Boolean,
			Futures: Boolean
		}
	},
	Signals: [
		{
			SignalChatID: String,
			SignalEntryDate: Date,
			ExchangeType: Array,
			Currency: Array,
			DoneTargets: Array,
			Capital: Object,
			PositionStatus: String,
			Quantity: Number,
			EntryPrice: String,
			PositionOrderID: Number,
			StopLoss: Object,
			StoplossHitDate: Date,
			ForceStop: Object
		}
	],
	WalletBalanceHistory: [
		{
			Date: Date,
			Spot: {
				USDT: Number,
				BTC: Number
			},
			Futures: {
				USDT: Number
			}
		}
	]
});

var Users = Mongoose.model('Users', UsersSchema);
module.exports = Users;
