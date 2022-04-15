const DatabaseQuery = require(`${__dirname}/../database/database-query`).DatabaseQuery;
const SignalUpdate = require(`${__dirname}/../analysis/signals-query/signal-update`).SignalUpdate;
// const BinanceFutures = require(`${__dirname}/exchanges/binance/futures`);
// BinanceFutures.CreateBinanceConnection();

class RequestManager {
	constructor() {
		this.MaxRequestCount = 10;

		this.Requests = {};

		this.RefreshRequests();

		setInterval(() => {
			this.ReRequest();
		}, 5000);
	}

	RefreshRequests() {
		setInterval(() => {
			Object.keys(this.Requests).map(async (RequestID) => {
				if (this.Requests[RequestID].Status === 'failed' || this.Requests[RequestID].Status === 'done') {
					if (this.TimeDifference(RequestID) > 20) {
						const InsertStatus = await DatabaseQuery.AsyncMakeDatabaseQuery({
							DBQueryMethod: 'Insert',
							MethodData: {
								ModelName: 'exb-expired-api-requests',
								InsertData: this.Requests[RequestID]
							}
						});
					}
				}
			});
		}, 300000);
	}

	TimeDifference(RequestID) {
		var Diff = (new Date(Date.now()).getTime() - this.Requests[RequestID].LastRequest) / 1000;
		Diff /= 60;
		return Math.abs(Math.round(Diff));
	}

	RequestDoneAsk(RequestID) {
		return this.Requests[RequestID].Status;
	}

	GenerateRequestID() {
		return parseInt(Math.random() * 10000000000000000000);
	}

	AddRequest(ExchangeOBJName, MethodName, Params, CheckMethodName, ChatID, UpdateMethod) {
		const RequestID = this.GenerateRequestID();

		this.Requests[RequestID] = {
			ExchangeOBJName: ExchangeOBJName,
			MethodName: MethodName,
			Params: Params,
			LastRequest: new Date(Date.now()).getTime(),
			RequestCount: 0,
			CheckMethodName: CheckMethodName,
			ChatID: ChatID,
			Status: 'pending',
			UpdateMethod: UpdateMethod
		};

		return RequestID;
	}

	CreateUpdateQuery(UpdateMethod, APIReturn, Params, Failed) {
		let UpdateQuery = {};
		UpdateQuery[UpdateMethod.UpdateType] = {};

		if (typeof UpdateMethod.ValueKey === 'string') {
			if (Failed) UpdateQuery[UpdateMethod.UpdateType][UpdateMethod.FieldName] = 'failed';
			else UpdateQuery[UpdateMethod.UpdateType][UpdateMethod.FieldName] = APIReturn[UpdateMethod.ValueKey];
		}

		if (typeof UpdateMethod.ValueKey === 'object') {
			Object.keys(UpdateMethod.ValueKey).map((VKKey) => {
				if (typeof UpdateMethod.ValueKey[VKKey] === 'string') {
					let VKValueArray = UpdateMethod.ValueKey[VKKey].split('.');

					if (VKValueArray[0] === 'Block') {
						UpdateMethod.ValueKey[VKKey] = Params[parseInt(VKValueArray[1])];
					} else if (VKValueArray[0] === 'API') {
						if (Failed) UpdateMethod.ValueKey[VKKey] = 'failed';
						else UpdateMethod.ValueKey[VKKey] = APIReturn[VKValueArray[1]];
					}
				}
			});

			UpdateQuery[UpdateMethod.UpdateType][UpdateMethod.FieldName] = UpdateMethod.ValueKey;
		}

		return UpdateQuery;
	}

	ReRequest() {
		Object.keys(this.Requests).map((RequestID) => {
			const { ExchangeOBJName, MethodName, Params, Status, UpdateMethod, ChatID } = this.Requests[RequestID];

			if (Status != 'requesting' && Status != 'failed' && Status != 'done') {
				this.Requests[RequestID].Status = 'requesting';

				setTimeout(async () => {
					var ParamText = '';

					Params.forEach((Param, Index) => {
						if (typeof Param === 'number') ParamText += `${Param}`;
						else ParamText += `"${Param}"`;

						if (Index != Params.length - 1) ParamText += ',';
					});

					const APIReturn = await eval(`${ExchangeOBJName}.${MethodName}(${ParamText});`);

					if (typeof APIReturn === 'undefined') {
					}

					// 	`${ExchangeOBJName}.${this.Requests[RequestID].CheckMethodName}('${JSON.stringify(
					// 		APIReturn
					// 	).replace(/(')/g, '')}')`,
					// 	'hfdahdf'
					// );
					const CheckStatus = eval(
						`${ExchangeOBJName}.${this.Requests[RequestID].CheckMethodName}('${JSON.stringify(
							APIReturn
						).replace(/(')/g, '')}'))`
					);

					if (CheckStatus) {
						// Update signal
						let UpdateQuery = this.CreateUpdateQuery(UpdateMethod, APIReturn, Params, false);

						await SignalUpdate.SignalUpdate(ChatID, UpdateQuery);

						// Change request status to 'done'
						this.Requests[RequestID].Status = 'done';
					} else {
						this.Requests[RequestID].LastRequest = new Date(Date.now()).getTime();

						this.Requests[RequestID].RequestCount++;

						if (this.Requests[RequestID].RequestCount * 20000 > 1000000) {
							// 20000 > 1000000
							// Update signal
							let UpdateQuery = this.CreateUpdateQuery(UpdateMethod, {}, Params, true);

							await SignalUpdate.SignalUpdate(ChatID, UpdateQuery);

							// Change request status to 'failed'
							this.Requests[RequestID].Status = 'failed';
						} else {
							this.Requests[RequestID].Status = 'pending';
						}
					}
				}, this.Requests[RequestID].RequestCount * 2000); // 20000
			}
		});
	}
}

module.exports = RequestManager;
