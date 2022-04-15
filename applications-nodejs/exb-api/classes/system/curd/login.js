const SHA256 = require('sha256');

const User = require(`${__dirname}/../user/user.js`).User;

var Login = Login || {};

Login = {
    LoginValidate: async (Username, Password) => {
        // const UserData = await User.AddUser({ Username: Username, Password: SHA256(Password), Status: 'active' });

        const UserData = await User.GetUser({ Username: Username, Password: SHA256(Password) }, '_id');

        if (!UserData.length) return false;

        return true;
    }
};

exports.Login = Login;
