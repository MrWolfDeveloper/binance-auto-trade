const Express = require('express');
const Router = Express.Router();

const Login = require(`${__dirname}/../classes/system/curd/login.js`).Login;

// Login.LoginVaidate('mrwolf', 'Aa106677889@');

// Load login page
Router.get('/system/login', (Request, Response) => {
    const IP = Request.headers['x-forwarded-for']?.split(',').shift() || Request.socket?.remoteAddress;

    console.log(IP, 'IP');

    return Response.render('login');
});

Router.get('/system/logout', async (Request, Response) => {
    Request.session.destroy();

    return Response.redirect('/system/login');
});

// Process Login data
Router.post('/system/login', async (Request, Response) => {
    const { Username, Password } = Request.body;
    try {
        const LoginStatus = await Login.LoginValidate(Username, Password);

        if (!LoginStatus) return Response.json({ status: false });

        Request.session.UserLogin = { status: true };

        console.log(Request.session);

        return Response.json({ status: true });
    } catch (ReturnError) {
        console.error(ReturnError, '/system/login');

        return Response.json({ status: false });
    }
});

module.exports = Router;
