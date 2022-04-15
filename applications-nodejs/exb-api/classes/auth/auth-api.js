const DatabaseQuery = require(`${__dirname}/../database/database-query.js`).DatabaseQuery;

var AuthAPI = AuthAPI || {};

AuthAPI = {
	ValidateAPI: async (APIKey, APISecret) => {
		try {
			var API = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'Select',
				MethodData: {
					ModelName: 'exb-system-api',
					SelectKeys: '_id',
					SelectOptions: {},
					Where: {
						API_KEY: APIKey,
						API_SECRET: APISecret
					}
				}
			});

			return API[1].length > 0;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	},
	AddAPIData: async () => {
		try {
			var API = await DatabaseQuery.AsyncMakeDatabaseQuery({
				DBQueryMethod: 'InsertMany',
				MethodData: {
					ModelName: 'exb-system-api',
					InsertData: {
						API_KEY: 'GCG0UJOXRKJ7TA0DZ3IEFK0Q353AZIZDTE6F7SQTQ7K2VL6OXYSB87HOXJWRQTAQ',
						API_SECRET: 'TDso2GNOEUV0qhGvg4VyBaHpjh2xgK5b1gJVZr5ZHgl29KasnFrUDUg5U7nRlblz'
					}
				}
			});

			return API[1].length > 0;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}
};

exports.AuthAPI = AuthAPI;
