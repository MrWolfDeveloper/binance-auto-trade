var Mongoose = require('mongoose');

var SystemUsersSchema = new Mongoose.Schema({
    Username: { type: String, require: true, unique: true },
    Password: { type: String, require: true },
    Status: {
        type: String,
        require: true,
        default: 'disabled',
        enum: [ 'disabled', 'active' ]
    }
});

var SystemUsers = Mongoose.model('SystemUsers', SystemUsersSchema);
module.exports = SystemUsers;
