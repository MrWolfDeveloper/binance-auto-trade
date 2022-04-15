const JWT = require('jsonwebtoken');

var AuthMiddleware = AuthMiddleware || {};

AuthMiddleware = {
	/**
     *  A middleware for authorization JWT token
     *  @param { Object } Request
     *  @param { Object } Response
     *  @param { Object } Next
     *  @return { Object } Response object
     */
	AuthLogin: async (Request, Response, Next) => {
		try {
			// Routes without authorization
			if (Request.originalUrl === '/auth') return Next();

			if (/external(.*)/g.test(Request.originalUrl)) return Next();

			// System routes
			if (/system(.*)/g.test(Request.originalUrl) || /favicon.ico/g.test(Request.originalUrl)) return Next();

			// Bearer ${Token}
			const AuthToken = Request.header('authorization') && Request.header('authorization').split(' ')[1];

			/* ---------------------------- Problem with JWT token --------------------------- */
			if (AuthToken === null) return Response.status(401).json({ code: -2018 });

			const TokenVerified = JWT.verify(
				AuthToken,
				'59e2c8376c11b4175c015f90e138be50fcc01c0f5dd4fb63e7d355f6ea244e7b5d681efbe7f49da21b8f4e41db1f5ce0adc6d688f32d32fe137ea8541f70b800'
			);

			/* ---------------------------- Not yet logged in --------------------------- */
			if (!TokenVerified) return Response.status(401).json({ code: -2018 });

			Request.ui = TokenVerified.ui;

			Next();
		} catch (Error) {
			console.error(Error);

			return Response.status(401).json({ code: -2018 });
		}
	}
};

exports.AuthMiddleware = AuthMiddleware;
