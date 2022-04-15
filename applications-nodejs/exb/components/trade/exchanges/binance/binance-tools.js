const DataBaseQuery = require('../../../database/database-query').DatabaseQuery;

const SymbolData = require(`${__dirname}/../../../../../../storage/exchange-data/symbol-data-futures.json`);
const SpotSymbolData = require(`${__dirname}/../../../../../../storage/exchange-data/symbol-data-spot.json`);

class BinanceTools {
	constructor(ExchangeType) {
		this.ChildET = ExchangeType;
	}

	get BinanceConnection() {
		if (this.ChildET === 'spot') return this.SPOT_CONNECTION;
		if (this.ChildET === 'futures') return this.FUTURES_CONNECTION;
	}

	ToFixed(Number, Fixed) {
		// var Regex = new RegExp('^-?\\d+(?:.\\d{0,' + (Fixed || -1) + '})?');
		// return Number.toString().match(Regex)[0];

		return parseFloat(Number).toFixed(Fixed);
	}

	ScientificToDecimal(num) {
		var nsign = Math.sign(num);
		//remove the sign
		num = Math.abs(num);
		//if the number is in scientific notation remove it
		if (/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
			var zero = '0',
				parts = String(num).toLowerCase().split('e'), //split into coeff and exponent
				e = parts.pop(), //store the exponential part
				l = Math.abs(e), //get the number of zeros
				sign = e / l,
				coeff_array = parts[0].split('.');
			if (sign === -1) {
				l = l - coeff_array[0].length;
				if (l < 0) {
					num =
						coeff_array[0].slice(0, l) +
						'.' +
						coeff_array[0].slice(l) +
						(coeff_array.length === 2 ? coeff_array[1] : '');
				} else {
					num = zero + '.' + new Array(l + 1).join(zero) + coeff_array.join('');
				}
			} else {
				var dec = coeff_array[1];
				if (dec) l = l - dec.length;
				if (l < 0) {
					num = coeff_array[0] + dec.slice(0, l) + '.' + dec.slice(l);
				} else {
					num = coeff_array.join('') + new Array(l + 1).join(zero);
				}
			}
		}

		return nsign < 0 ? '-' + num : num;
	}

	TimeDifference(SignalDate) {
		var Diff = (new Date(Date.now()).getTime() - SignalDate.getTime()) / 1000;
		Diff /= 60;

		return Math.abs(Math.round(Diff));
	}

	Sleep(MS) {
		return new Promise((Resolve) => setTimeout(Resolve, MS));
	}

	async AddFromDatabase() {
		var AllOpeningSignal = await DataBaseQuery.AsyncMakeDatabaseQuery({
			DBQueryMethod: 'Select',
			MethodData: {
				ModelName: 'exb-signals',
				SelectKeys:
					'ChatID ChannelID ExchangeType Currency EnterPrice PositionOrderID Targets OpenTargets DoneTargets Capital StopLoss ForceStop PositionStatus SignalDate PositionDate',
				SelectOptions: {},
				Where: {
					PositionStatus: 'opening'
				}
			}
		});

		AllOpeningSignal[1].map((Signal) => {
			this.AddToPendingPositions(Signal);
		});
	}

	async CalculationQuantity(Balances, Capital, Currency, CurrencyPrice, ExchangeType, Leverage, SecondeAsset) {
		var WalletBalance;
		if (ExchangeType === 'binance-spot') {
			if (SecondeAsset === 'USDT') WalletBalance = Balances['USDT_BALANCE_SPOT'];
			if (SecondeAsset === 'BTC') WalletBalance = Balances['BTC_BALANCE_SPOT'];
		}

		if (ExchangeType === 'binance-futures') WalletBalance = Balances['USDT_BALANCE_FUTURES'];

		var MainQuantity;
		if (SecondeAsset === 'USDT') MainQuantity = parseInt(WalletBalance * parseInt(Capital) / 100);
		if (SecondeAsset === 'BTC') MainQuantity = parseFloat(WalletBalance * parseInt(Capital) / 100);

		let CalculatedQuantity;

		/* ------------------------------ Binance spot ------------------------------ */
		if (ExchangeType === 'binance-spot') {
			CalculatedQuantity = (MainQuantity / CurrencyPrice).toFixed(SpotSymbolData[Currency].QuantityPrecision);

			if (CalculatedQuantity > parseFloat(SpotSymbolData[Currency].MaxQuantity)) {
				return { Status: false, ErrorCode: -7001 };
			} else if (CalculatedQuantity < parseFloat(SpotSymbolData[Currency].MinQuantity)) {
				return { Status: false, ErrorCode: -7002 };
			}

			return { Status: true, CalculatedQuantity: CalculatedQuantity };
		}

		/* ----------------------------- Binance futures ---------------------------- */
		if (ExchangeType === 'binance-futures') {
			CalculatedQuantity = (MainQuantity / CurrencyPrice * Leverage).toFixed(
				SymbolData[Currency].QuantityPrecision
			);

			if (CalculatedQuantity > parseFloat(SymbolData[Currency].MaxQuantity)) {
				return { Status: false, ErrorCode: -7001 };
			} else if (CalculatedQuantity < parseFloat(SymbolData[Currency].MinQuantity)) {
				return { Status: false, ErrorCode: -7002 };
			}

			return { Status: true, CalculatedQuantity: CalculatedQuantity };
		}
	}
}

module.exports = BinanceTools;
