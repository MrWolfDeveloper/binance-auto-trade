var Coinbase = require('coinbase-commerce-node');
class PaymentValidate {
	CoinbaseCommerceCharge;

	constructor() {
		// let Client = Coinbase.Client;
		// Client.init('5bc00725-6f0c-49e3-b104-aac954c65c13');
		// this.CoinbaseCommerceCharge = Coinbase.resources.Charge;
	}

	CoinbaseCommerceGetCharge() {
		return new Promise((Resolve, Reject) => {
			this.CoinbaseCommerceCharge.retrieve('', function(Error, Response) {
				if (Error) return Reject(Error);

				return Resolve(Response[0].payments);
			});
		});
	}

	async CoinbaseCommerce(TXID) {
		try {
			// const Payments = await this.CoinbaseCommerceGetCharge();

			// const FoundPayment = Payments.filter((Payment) => Payment.transaction_id === TXID);

			// if (!FoundPayment.length || FoundPayment[0].status != 'CONFIRMED') return false;

			return true;
		} catch (ReturnError) {
			throw new Error(ReturnError);
		}
	}
}

module.exports = PaymentValidate;
