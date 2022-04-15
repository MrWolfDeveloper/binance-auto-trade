const UserData = require(`${__dirname}/../classes/user-data/user-data.js`).UserData;
const Validate = require(`${__dirname}/../classes/validate/validate.js`).Validate;

const Express = require('express');
const Router = Express.Router();

Router.get('/wallet/history/:Username', async (Request, Response) => {
    const { Username } = Request.params;

    try {
        const DataValidate = await Validate.AsyncDictionaryObjectKeyRegexCheck([
            { VariableKey: 'Username', VariableValue: Username, Regex: { Name: 'Username' } }
        ]);

        // Invalid username format
        if (DataValidate[1].length)
            return Response.status(422).json({
                code: -2014,
                fields: DataValidate[1]
            });

        var UserWalletBalanceHistory = await UserData.GetUserInfo(Username, 'WalletBalanceHistory');

        return Response.status(200).json({
            code: 200,
            walletHistory: UserWalletBalanceHistory[0].WalletBalanceHistory
        });
    } catch (ReturnError) {
        console.error(ReturnError, 'GET /wallet/history/:Username');

        return Response.status(403).json({ code: -2015 });
    }
});

module.exports = Router;
