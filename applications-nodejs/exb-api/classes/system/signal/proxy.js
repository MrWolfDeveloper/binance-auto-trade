const FS = require('fs');
const Binance = require('node-binance-api');

var ProxyHandler = ProxyHandler || {};

ProxyHandler = {
	ReturnProxyIP: () => {
		let ProxiesFile = FS.readFileSync(`${__dirname}/../../../../../storage/proxy/proxy-list.json`);
		let ProxiesJSON = JSON.parse(ProxiesFile);

		const ProxyList = ProxiesJSON.Proxies;

		return ProxyList[Math.floor(Math.random() * ProxyList.length)];
	},

	ProxyCheck: (ProxyData) => {
		const BinanceConnection = new Binance().options({
			APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
			APISECRET: 'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM',
			verbose: true,
			hedgeMode: true,
			proxy: {
				host: ProxyData.host,
				port: ProxyData.port,
				auth: { username: ProxyData.username, password: ProxyData.password }
			}
		});

		return new Promise((Resolve, Reject) => {
			BinanceConnection.account((ReturnError, Response) => {
				if (ReturnError) return Reject(ReturnError);

				return Resolve(Response);
			});
		});
	},

	BestProxyIP: () => {
		return {
			host: 'dedicated',
			port: 'dedicated',
			auth: { username: 'dedicated', password: 'dedicated' }
		};

		// return new Promise((Resolve) => {
		// 	var ProxyData = ProxyHandler.ReturnProxyIP();
		// 	var ProxyDataArray = ProxyData.split(':');
		// 	var ProxyData = {
		// 		host: ProxyDataArray[0],
		// 		port: ProxyDataArray[1],
		// 		username: ProxyDataArray[2],
		// 		password: ProxyDataArray[3]
		// 	};
		// 	ProxyHandler.ProxyCheck(ProxyData)
		// 		.then((ReturnData) => {
		// 			console.log(`Proxy ${ProxyData} was selected`);
		// 			Resolve({
		// 				host: ProxyData.host,
		// 				port: ProxyData.port,
		// 				auth: { username: ProxyData.username, password: ProxyData.password }
		// 			});
		// 		})
		// 		.catch((ReturnError) => {
		// 			console.log(ReturnError, 'BadProxyError');
		// 			console.log('Bad proxy');
		// 			Resolve(ProxyHandler.BestProxyIP());
		// 		});
		// 	// ProxyCheck(`${ProxyDataArray[2]}:${ProxyDataArray[3]}@${ProxyDataArray[0]}:${ProxyDataArray[1]}`)
		// 	//     .then((ReturnData) => {
		// 	//         console.log(`Proxy ${ProxyData} was selected`);
		// 	//         ProxyData = ProxyData.split(':');
		// 	// Resolve({
		// 	//     host: ProxyData[0],
		// 	//     port: ProxyData[1],
		// 	//     auth: { username: ProxyData[2], password: ProxyData[3] }
		// 	// });
		// 	//     })
		// 	//     .catch((ReturnError) => {
		// 	//         console.log(ReturnError);
		// 	// console.log('Bad proxy');
		// 	// Resolve(ProxyHandler.BestProxyIP());
		// 	//     });
		// });
	}
};

exports.ProxyHandler = ProxyHandler;
