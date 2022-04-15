var Mongoose = require('mongoose');

var ExpiredAPIRequestsSchema = new Mongoose.Schema({
    ExchangeOBJName: String,
    MethodName: String,
    Params: Array,
    LastRequest: Number,
    RequestCount: Number,
    CheckMethodName: String,
    ChatID: String,
    Status: String,
    UpdateMethod: Object
});

var ExpiredAPIRequests = Mongoose.model('ExpiredAPIRequests', ExpiredAPIRequestsSchema);
module.exports = ExpiredAPIRequests;