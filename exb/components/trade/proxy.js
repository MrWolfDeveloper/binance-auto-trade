const FS = require('fs');
const Binance = require('node-binance-api');

var ProxyHandler = ProxyHandler || {};

ProxyHandler = {
    ReturnProxyIP: () => {
        let ProxiesFile = FS.readFileSync(`${__dirname}/../../../../storage/proxy/proxy-list.json`);
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
        return new Promise((Resolve) => {
            var ProxyData = ProxyHandler.ReturnProxyIP();

            var ProxyDataArray = ProxyData.split(':');

            var ProxyData = {
                host: ProxyDataArray[0],
                port: ProxyDataArray[1],
                username: ProxyDataArray[2],
                password: ProxyDataArray[3]
            };

            ProxyHandler.ProxyCheck(ProxyData)
                .then((ReturnData) => {
                    Resolve({
                        host: ProxyData.host,
                        port: ProxyData.port,
                        auth: { username: ProxyData.username, password: ProxyData.password }
                    });
                })
                .catch((ReturnError) => {
                    Resolve(ProxyHandler.BestProxyIP());
                });
        });
    }
};

exports.ProxyHandler = ProxyHandler;
