const FS = require('fs');
const { parse } = require('path');
const Request = require('request');

const SpotPricePrecision = require(`${__dirname}/../../../../../storage/exchange-data/symbol-data-spot.json`);
const FuturesPricePrecision = require(`${__dirname}/../../../../../storage/exchange-data/symbol-data-futures.json`);

var BinanceKillers = BinanceKillers || {};

BinanceKillers = {
	Precision: (ExchangeType, Currency, Amount) => {
		console.log(Currency, 'Currency');
		Currency = Currency.replace('coin:', '').toUpperCase();
		return FuturesPricePrecision[Currency].PricePrecision;

		// if (Amount.indexOf('.') < 0) return 0;

		// return Amount.split('.')[1].length;
	},

	ToFixed: (Number, Fixed) => {
		// var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
		// return Number.toString().match(Regex)[0];
		return parseFloat(Number).toFixed(Fixed);
	},

	AnalysisContent: (FilesContent) => {
		var AnalysisContent = FilesContent.map((ChannelData) => {
			return ChannelData.Data.map((Content, index) => {
				if (!Content.message) return;

				const RegexFile = require(`${__dirname}/../regex/bk.js`).Regex;

				// Remove extra spaces from signal
				Content.message = Content.message.replace(/\s+$/, '');
				Content.message = Content.message.replace(/[ ]{1,}/gm, '');
				Content.message = Content.message.toLowerCase();

				var ForceStop = Content.message.match(RegexFile.ForceStop);

				var Direction = Content.message.match(RegexFile.ExchangeType);
				var Currency = Content.message.match(RegexFile.Currency);
				var EnterPrice = Content.message.match(RegexFile.EnterPrice);
				var Targets = Content.message.match(RegexFile.Targets);
				var StopLoss = Content.message.match(RegexFile.StopLoss);

				if (Direction) {
					Targets[0] = Targets[0].replace('shortterm:', '').replace(/,/gm, '').split('-');

					var ExchangeType = [];

					EnterPrice = EnterPrice[0].replace('entry:', '').replace(/,/gm, '').split('-');

					ExchangeType[0] = 'binance-futures';
					ExchangeType[1] = Direction[0]
						.replace('direction:', '')
						.replace(/📈/gm, '')
						.toLowerCase()
						.replace(/\s+$/, '')
						.replace(/📉/gm, '');

					// Reduction coefficient
					var ReductionCoefficient = 0.0;

					if (ExchangeType[1] === 'long') ReductionCoefficient = 0.999;
					else if (ExchangeType[1] === 'short') ReductionCoefficient = 1.001;

					var CapitalOBJ = {
						Percentage: '2'
					};

					var CurrencyAndRange = Currency[0].split('(');
					console.log(CurrencyAndRange[0].replace('coin:', '').replace('$', '').toUpperCase().split('/'));
					Currency = CurrencyAndRange[0].replace('coin:', '').replace('$', '').toUpperCase().split('/');

					CapitalOBJ.Leverage = 'isolated';
					CapitalOBJ.Range = CurrencyAndRange[1]
						.replace('x', '')
						.replace('(', '')
						.replace(')', '')
						.split('-');

					if (CapitalOBJ.Range.length > 1) {
						CapitalOBJ.Range.sort((a, b) => {
							return a - b;
						});

						CapitalOBJ.Range.pop();
					}

					if (CapitalOBJ.Range.toString() === '1') CapitalOBJ.Range = '2';

					StopLoss = StopLoss[0].toLowerCase();

					var StopLossOBJ = {};

					StopLoss.indexOf('below') > -1
						? (StopLossOBJ.CandleSide = 'below')
						: (StopLossOBJ.CandleSide = 'above');

					StopLoss.indexOf('manual') > -1 ? (StopLossOBJ.Type = 'manual') : (StopLossOBJ.Type = 'normal');

					StopLossOBJ.Number = StopLoss.replace(/,/gm, '').replace('stoploss:', '');

					// Change StopLoss number before insert
					var StopLossPrecision = BinanceKillers.Precision(
						ExchangeType[0],
						Currency.join(''),
						StopLossOBJ.Number
					);

					// StopLossOBJ.Number = StopLossOBJ.Number * ReductionCoefficient;
					StopLossOBJ.Number = parseFloat(StopLossOBJ.Number).toFixed(StopLossPrecision);

					console.log(Targets);

					// Remove empty targets
					var NewTargets = Targets[0].map((Target) => Target.replace('Target:', '').trim());
					NewTargets = NewTargets.filter((Item) => Item);

					console.log(NewTargets, 'NewTargets');

					var StructuredTargets = NewTargets.map((Target) => {
						var TargetNumber = Target.replace('Target:', '').trim();
						var TargetPrecision = BinanceKillers.Precision(
							ExchangeType[0],
							Currency.join(''),
							TargetNumber
						);

						// Change Target number before insert
						TargetNumber = TargetNumber * ReductionCoefficient;

						return parseFloat(TargetNumber).toFixed(TargetPrecision);
					});

					return {
						ChatID: `bk-${Content.id}`,
						ExchangeType: ExchangeType,
						Currency: Currency,
						EnterPrice: [ EnterPrice[0].trim(), EnterPrice[1].trim() ],
						Targets: StructuredTargets,
						OpenTargets: [],
						Capital: CapitalOBJ,
						StopLoss: StopLossOBJ,
						ForceStop: 'not-set',
						PositionStatus: 'open',
						SignalDate: new Date(Date.now())
					};
				}
				// else if (ForceStop) {
				// 	if (typeof Content.reply_to === 'undefined') return;

				// 	// Request(
				// 	// 	{
				// 	// 		url: 'https://api.exb.app/external/dce215a2630deaf69c233ee9fc883fb0cb9aa143',
				// 	// 		method: 'POST',
				// 	// 		headers: {
				// 	// 			'content-type': 'application/json'
				// 	// 		},
				// 	// 		body: {
				// 	// 			ChatID: `bk-${Content.reply_to.reply_to_msg_id}`
				// 	// 		},
				// 	// 		json: true
				// 	// 	},
				// 	// 	(err, httpResponse, body) => {
				// 	// 		console.log(err, body);
				// 	// 	}
				// 	// );
				// }
			});
		});

		return AnalysisContent[0].filter(function(Element) {
			return Element != null;
		});
	}
};

exports.BinanceKillers = BinanceKillers;
