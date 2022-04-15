const Express = require('express');
const Router = Express.Router();

const JWT = require('jsonwebtoken');

const AuthAPI = require(`${__dirname}/../classes/auth/auth-api.js`).AuthAPI;

Router.post('/auth', async (Request, Response) => {
    const { EXB_API_KEY, EXB_API_SECRET } = Request.body;

    try {
        if (!await AuthAPI.ValidateAPI(EXB_API_KEY, EXB_API_SECRET)) return Response.status(403).json({ code: -2015 });

        // Set JWT Token
        const JWTToken = JWT.sign(
            {},
            '59e2c8376c11b4175c015f90e138be50fcc01c0f5dd4fb63e7d355f6ea244e7b5d681efbe7f49da21b8f4e41db1f5ce0adc6d688f32d32fe137ea8541f70b800',
            {
                expiresIn: '1440m'
            }
        );

        return Response.status(200).json({ code: 200, token: JWTToken });
    } catch (ReturnError) {
        console.error(ReturnError, 'POST /auth');

        return Response.status(403).json({ code: -2015 });
    }
});

module.exports = Router;
