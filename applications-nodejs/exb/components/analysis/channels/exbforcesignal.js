const FS = require('fs');
const Request = require('request');

const SpotPricePrecision = require(`${__dirname}/../../../../../storage/exchange-data/symbol-data-spot.json`);
const FuturesPricePrecision = require(`${__dirname}/../../../../../storage/exchange-data/symbol-data-futures.json`);

var exbforcesignal = exbforcesignal || {};

exbforcesignal = {
	Precision: (ExchangeType, Currency, Amount) => {
		if (typeof Currency === 'object') Currency = Currency[0].replace('#', '').replace('/', '');

		console.log(Currency, 'Currency');

		if (ExchangeType === 'binance-spot') return SpotPricePrecision[Currency].PricePrecision;
		if (ExchangeType === 'binance-futures') return FuturesPricePrecision[Currency].PricePrecision;

		// console.log(FuturesPricePrecision, 'FuturesPricePrecision');
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

				const RegexFile = require(`${__dirname}/../regex/rs.js`).Regex;
				const RegexFileBK = require(`${__dirname}/../regex/bk.js`).Regex;

				// Remove extra spaces from signal
				Content.message = Content.message.replace(/\s+$/, '');
				Content.message = Content.message.replace(/[ ]{1,}/gm, '');

				var ForceStop = Content.message.match(RegexFile.ForceStop);

				var Direction = Content.message.match(RegexFile.RegexFileBK);

				console.log(Direction, 'Direction');

				console.log(Content.message, 'Content.message');
				console.log(ForceStop, 'ForceStop');

				var ExchangeType = Content.message.match(RegexFile.ExchangeType);
				var Currency = Content.message.match(RegexFile.Currency);
				var EnterPrice = Content.message.match(RegexFile.EnterPrice);
				var Targets = Content.message.match(RegexFile.Targets);
				var OpenTargets = Content.message.match(RegexFile.OpenTargets);
				var Capital = Content.message.match(RegexFile.Capital);
				var StopLoss = Content.message.match(RegexFile.StopLoss);

				if (ExchangeType) {
					ExchangeType = ExchangeType[0].split('(');

					EnterPrice = EnterPrice[0].replace('Enterprice:', '').split('🔛');

					if (ExchangeType.length > 1) {
						ExchangeType[0] = 'binance-futures';
						ExchangeType[1] = ExchangeType[1].replace(')', '').toLowerCase().replace(/\s+$/, '');
					} else {
						ExchangeType[0] = 'binance-spot';
					}

					var NewCapital = Capital[0].toLowerCase().replace('⚠️', '').replace('capital', '');

					var CapitalOBJ = {
						Percentage: NewCapital.split('%')[0]
					};

					// Reduction coefficient
					var ReductionCoefficient = 0.0;
					if (ExchangeType[0] === 'binance-futures') {
						if (ExchangeType[1] === 'long') ReductionCoefficient = 0.999;
						else if (ExchangeType[1] === 'short') ReductionCoefficient = 1.001;
					} else {
						ReductionCoefficient = 0.999;
					}

					if (NewCapital.indexOf('(') > -1 && ExchangeType[0] === 'binance-futures') {
						var CapitalText = NewCapital.match(/((?:isolated|cross)(.*))/gm);

						CapitalText = CapitalText[0].replace(')', '').replace('x', '');

						// CapitalText = CapitalText.split(' ');

						CapitalOBJ.Leverage = CapitalText.match(/((?:isolated|cross))/gm)[0];
						CapitalOBJ.Range = CapitalText.replace(/((?:isolated|cross))/gm, '').split('-');
					}

					StopLoss = StopLoss[0].toLowerCase();

					var StopLossOBJ = {};

					StopLoss.indexOf('below') > -1
						? (StopLossOBJ.CandleSide = 'below')
						: (StopLossOBJ.CandleSide = 'above');

					StopLoss.indexOf('manual') > -1 ? (StopLossOBJ.Type = 'manual') : (StopLossOBJ.Type = 'normal');

					if (StopLossOBJ.Type === 'manual') {
						if (StopLoss.indexOf('daily') > -1) StopLossOBJ.CandleInterval = '1d';
						if (StopLoss.indexOf('weekly') > -1) StopLossOBJ.CandleInterval = '1w';
						if (StopLoss.indexOf('1h') > -1) StopLossOBJ.CandleInterval = '1h';
						if (StopLoss.indexOf('4h') > -1) StopLossOBJ.CandleInterval = '4h';
						if (StopLoss.indexOf('1m') > -1) StopLossOBJ.CandleInterval = '1m';

						StopLossOBJ.Number = StopLoss.match(RegexFile.ManualStopLoss);
						StopLossOBJ.Number = StopLossOBJ.Number[0].replace(/(?:below|above)/i, '').trim();
					} else {
						StopLossOBJ.Number = StopLoss.match(RegexFile.NormalStopLoss);
						StopLossOBJ.Number = StopLossOBJ.Number[0].replace('normalstoploss:', '');
						StopLossOBJ.Number = StopLossOBJ.Number.trim();
						StopLossOBJ.Number = StopLossOBJ.Number;

						// Change StopLoss number before inster
						var StopLossPrecision = exbforcesignal.Precision(ExchangeType[0], Currency, StopLossOBJ.Number);

						// StopLossOBJ.Number = StopLossOBJ.Number * ReductionCoefficient;
						StopLossOBJ.Number = parseFloat(StopLossOBJ.Number).toFixed(StopLossPrecision);
					}

					if (OpenTargets) {
						OpenTargets = OpenTargets[0]
							.replace(/(?:OpenTargets:|OpenTarget:)[ ]?[\n]?[ ]?/gm, '')
							.replace('\n', '')
							.replace(/\s/g, '')
							.split('-');
					} else {
						OpenTargets = [];
					}

					// Remove empty targets
					var NewTargets = Targets.map((Target) => Target.replace('Target:', '').trim());
					NewTargets = NewTargets.filter((Item) => Item);

					var StructuredTargets = NewTargets.map((Target) => {
						var TargetNumber = Target.replace('Target:', '').trim();
						var TargetPrecision = exbforcesignal.Precision(ExchangeType[0], Currency, TargetNumber);

						// Change Target number before insert
						TargetNumber = TargetNumber * ReductionCoefficient;

						return parseFloat(TargetNumber).toFixed(TargetPrecision);
					});

					var StructuredOpenTargets = OpenTargets.map((OpenTarget) => {
						var OpenTargetNumber = OpenTarget;
						var OpenTargetPrecision = exbforcesignal.Precision(ExchangeType[0], Currency, OpenTargetNumber);

						// Change OpenTarget number before insert
						OpenTargetNumber = OpenTargetNumber * ReductionCoefficient;

						return parseFloat(OpenTargetNumber).toFixed(OpenTargetPrecision);
					});

					return {
						ChatID: `rsf-${Content.id}`,
						ExchangeType: ExchangeType,
						Currency: Currency[0].replace('#', '').replace(/\s+$/, '').split('/'),
						EnterPrice: [ EnterPrice[0].trim(), EnterPrice[1].trim() ],
						Targets: StructuredTargets,
						OpenTargets: StructuredOpenTargets,
						Capital: CapitalOBJ,
						StopLoss: StopLossOBJ,
						ForceStop: 'not-set',
						PositionStatus: 'open',
						SignalDate: new Date(Date.now())
					};
				} else if (Direction) {
					Content.message = Content.message.toLowerCase();

					var Direction = Content.message.match(RegexFileBK.ExchangeType);
					var Currency = Content.message.match(RegexFileBK.Currency);
					var EnterPrice = Content.message.match(RegexFileBK.EnterPrice);
					var Targets = Content.message.match(RegexFileBK.Targets);
					var StopLoss = Content.message.match(RegexFileBK.StopLoss);

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
						Percentage: '3'
					};

					var CurrencyAndRange = Currency[0].split('(');
					console.log(CurrencyAndRange[0].replace('coin:', '').replace('$', '').toUpperCase().split('/'));
					Currency = CurrencyAndRange[0].replace('coin:', '').replace('$', '').toUpperCase().split('/');
					console.log(Currency, 'CurrencyCurrency');

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

					StopLoss = StopLoss[0].toLowerCase();

					var StopLossOBJ = {};

					StopLoss.indexOf('below') > -1
						? (StopLossOBJ.CandleSide = 'below')
						: (StopLossOBJ.CandleSide = 'above');

					StopLoss.indexOf('manual') > -1 ? (StopLossOBJ.Type = 'manual') : (StopLossOBJ.Type = 'normal');

					StopLossOBJ.Number = StopLoss.replace(/,/gm, '').replace('stoploss:', '');

					// Change StopLoss number before insert
					var StopLossPrecision = exbforcesignal.Precision(
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
						var TargetPrecision = exbforcesignal.Precision(
							ExchangeType[0],
							Currency.join(''),
							TargetNumber
						);

						// Change Target number before insert
						TargetNumber = TargetNumber * ReductionCoefficient;

						return parseFloat(TargetNumber).toFixed(TargetPrecision);
					});

					return {
						ChatID: `bkf-${Content.id}`,
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
				} else if (ForceStop) {
					if (typeof Content.reply_to === 'undefined') return;

					// Request(
					// 	{
					// 		url: 'https://api.exb.app/external/dce215a2630deaf69c233ee9fc883fb0cb9aa143',
					// 		method: 'POST',
					// 		headers: {
					// 			'content-type': 'application/json'
					// 		},
					// 		body: {
					// 			ChatID: `rsf-${Content.reply_to.reply_to_msg_id}`
					// 		},
					// 		json: true
					// 	},
					// 	(err, httpResponse, body) => {
					// 		console.log(err, body);
					// 	}
					// );
				}
			});
		});

		return AnalysisContent[0].filter(function(Element) {
			return Element != null;
		});
	}
};

exports.exbforcesignal = exbforcesignal;
