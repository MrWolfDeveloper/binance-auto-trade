const Express = require('express');
const Session = require('express-session');
const FS = require('fs');
const Path = require('path');

const DataBaseQuery = require(`${__dirname}/classes/database/database-query.js`).DatabaseQuery;
const UserData = require(`${__dirname}/classes/user-data/user-data.js`).UserData;
const AuthMiddleware = require(`${__dirname}/classes/auth/auth-middleware.js`).AuthMiddleware;

/* --------------------------- Connect to database --------------------------- */
(async () => {
	try {
		// await DataBaseQuery.DatabaseConnect('mongodb://localhost:27017/EXBDatabase');
		await DataBaseQuery.DatabaseConnect(
			'mongodb+srv://mrwolf:Aa106677889%40@exbdedicatedsirvan.mwyhi.mongodb.net/EXBDedicatedSirvan?retryWrites=true&w=majority'
		);

		console.log('Database Connected!');
	} catch (DatabaseError) {
		throw new Error(DatabaseError);
	}
})().then(async () => {
	// await UserData.UpdateAllUserBalances();

	// setInterval(async () => {
	// 	await UserData.UpdateAllUserBalances();
	// }, 21600000);

	const EXBSystem = Express();
	const Port = 3000;
	EXBSystem.use('/', Express.static(Path.resolve(__dirname, 'public')));
	EXBSystem.set('view engine', 'ejs');
	EXBSystem.set('views', 'views');
	EXBSystem.use(
		Express.json({
			limit: '50mb'
		})
	);
	EXBSystem.use(
		Express.urlencoded({
			limit: '50mb',
			extended: true
		})
	);
	EXBSystem.use(
		Session({
			secret: 'exb.app.mrwolf',
			resave: false,
			saveUninitialized: false,
			cookie: {
				expires: 60000000
			}
		})
	);
	// Login (Start)
	EXBSystem.use((Request, Response, Next) => {
		if (!/system(.*)/g.test(Request.originalUrl)) return Next();
		if (Request.originalUrl === '/system/login') {
			if (Request.session.UserLogin) return Response.redirect('/system');
			Next();
		} else {
			if (!Request.session.UserLogin) return Response.redirect('/system/login');
			Next();
		}
	});
	// Login (End)
	// EXBSystem.use((Request, Response, Next) => {
	//     var IP = Request.headers['x-forwarded-for'] || Request.socket.remoteAddress;
	//     console.log(`******** User IP: ${IP} ********`);
	//     Next();
	// });
	// Login auth middleware
	EXBSystem.use((Request, Response, Next) => {
		AuthMiddleware.AuthLogin(Request, Response, Next);
	});
	// Add Routes
	FS.readdir(`${__dirname}/routes`, (FSError, RouteFiles) => {
		if (FSError) throw new Error(FSError);
		RouteFiles.forEach((FileName) => {
			EXBSystem.use(require(`${__dirname}/routes/${FileName}`));
		});
	});
	EXBSystem.listen(Port, () => console.log(`EXB api & admin running on port ${Port}!`));
});
