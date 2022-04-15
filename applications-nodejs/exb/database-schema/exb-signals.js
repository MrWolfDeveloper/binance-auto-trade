var Mongoose = require('mongoose');

var ChannelSignalSchema = new Mongoose.Schema({
	ChatID: {
		type: String,
		unique: true,
		require: true
	},
	ChannelID: {
		type: String,
		require: true
	},
	ExchangeType: {
		type: Array,
		require: true
	},
	Currency: {
		type: Array,
		require: true
	},
	EnterPrice: {
		type: Array,
		require: true
	},
	PositionOrderID: String,
	OpenTargets: {
		type: Array
	},
	Targets: {
		type: Array,
		require: true
	},
	DoneTargets: Array,
	Capital: {
		type: Object,
		require: true
	},
	EntryPrice: String,
	Quantity: Number,
	StopLoss: {
		type: Object,
		require: true
	},
	StopLossHitDate: {
		type: Mongoose.Schema.Types.Mixed,
		default: 'not-set'
	},
	ForceStop: {
		type: Object
	},
	PositionStatus: {
		type: String
	},
	SignalDate: {
		type: Date,
		require: true,
		default: new Date(Date.now())
	},
	PositionDate: {
		OpenData: Date,
		CloseDate: Date
	},
	TradeError: String
});

var ChannelSignal = Mongoose.model('Signal', ChannelSignalSchema);

module.exports = ChannelSignal;
