var Regex = Regex || {};

Regex = {
	ExchangeType: /direction:(.*)/gi,
	Currency: /coin:(.*)/gi,
	EnterPrice: /entry:(.*)/gi,
	Targets: /shortterm:(.*)/gi,
	OpenTargets: /(?:OpenTargets:|OpenTarget:)[ ]?[\n]?[ ]?(.*)/gm,
	StopLoss: /stoploss:(.*)/gi
};

exports.Regex = Regex;
