var Mongoose = require('mongoose');

var ExpiredAPIRequestsSchema = new Mongoose.Schema({
	ChatID: String,
	Currency: String,
	CandleInterval: String,
	CandleSide: String,
	StopLoss: Number,
	Close: Boolean,
	CreatDate: {
		type: Date,
		default: new Date(Date.now())
	}
});

var ExpiredAPIRequests = Mongoose.model('ExpiredAPIRequests', ExpiredAPIRequestsSchema);
module.exports = ExpiredAPIRequests;
