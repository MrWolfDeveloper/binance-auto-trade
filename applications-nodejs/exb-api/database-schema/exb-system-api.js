var Mongoose = require('mongoose');

var SystemAPISchema = new Mongoose.Schema({
	API_KEY: String,
	API_SECRET: String
});

var SystemAPI = Mongoose.model('SystemAPI', SystemAPISchema);
module.exports = SystemAPI;
