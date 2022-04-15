const Express = require('express');
const Router = Express.Router();

const User = require(`${__dirname}/../classes/system/user/user.js`).User;

// Load users list
Router.get('/system/users', async (Request, Response) => {
    try {
        const Users = await User.GetTradeUsers(
            {},
            'Username Email PhoneNumber UseFreePlan SubscriptionData Signals TradeSpan ExchangesData AccountStatus'
        );

        var ReturnData = Users.map((User) => {
            // const UserWithSignals = User;
            // UserWithOutSignals['Signals'] = [];

            // console.log(User.Signals);

            return {
                Username: User.Username,
                Email: User.Email,
                PhoneNumber: User.PhoneNumber,
                UseFreePlan: User.UseFreePlan,
                PlanStartDate: new Date(User.SubscriptionData.PlanStartDate)
                    .toLocaleString('en-us', { year: 'numeric', month: '2-digit', day: '2-digit' })
                    .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'),
                PlanEndDate: new Date(User.SubscriptionData.PlanEndDate)
                    .toLocaleString('en-us', { year: 'numeric', month: '2-digit', day: '2-digit' })
                    .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'),
                AccountStatus: User.AccountStatus.toUpperCase(),
                Signals: `<button style="background-color: #848C8E; border-color: #848C8E;" onclick='ShowUserSignals("${User.Username}", ${JSON.stringify(
                    User.Signals
                )})' id="Signals|${User.Username}" class="button-primary">Signals</button>`,
                TradeSpan: `<button style="background-color: #848C8E; border-color: #848C8E;" onclick='ShowUserTS("${User.Username}", ${JSON.stringify(
                    User.TradeSpan
                )})' id="TradeSpan|${User.Username}" class="button-primary">Trade span</button>`,
                ExchangesData: `<button style="background-color: #848C8E; border-color: #848C8E;" onclick='ShowUserEXData("${User.Username}", ${JSON.stringify(
                    User.ExchangesData
                )})' id="ExchangesData|${User.Username}" class="button-primary">EXData</button>`,
                Action: `<button id="Edit|${User.Username}" style="background-color: #848C8E; border-color: #848C8E;" onclick='UserEditModal("${User.Username}", ${JSON.stringify(
                    User
                )})' class="button-primary">Edit</button><button id="Delete|${User.Username}" style="background-color: #DF5E5E; border-color: #DF5E5E;margin-left: 10px;" onclick='DeleteUser("${User.Username}")' class="button-primary">Delete</button>`
            };
        });

        return Response.json(ReturnData);
    } catch (ReturnError) {
        console.error(ReturnError, '/system/users');

        return Response.json([]);
    }
});

Router.post('/system/adduser', async (Request, Response) => {
    try {
        var UserData = Request.body;
        await User.AddUser(UserData);

        return Response.json({ status: true });
    } catch (ReturnError) {
        console.error(ReturnError, '/system/adduser');

        return Response.json({ status: false });
    }
});

Router.post('/system/deleteuser', async (Request, Response) => {
    try {
        await User.DeleteUser(Request.body.Username);

        return Response.json({ Status: true });
    } catch (ReturnError) {
        console.error(ReturnError, '/system/deleteuser');

        return Response.json({ Status: false });
    }
});

Router.post('/system/userupdate', async (Request, Response) => {
    try {
        await User.UpdateUser(Request.body.Username, Request.body.NewData);

        return Response.json({ Status: true });
    } catch (ReturnError) {
        console.error(ReturnError, '/system/userupdate');

        return Response.json({ Status: false });
    }
});

module.exports = Router;
