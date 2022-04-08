const DataBaseQuery = require(`${__dirname}/../../../database/database-query.js`).DatabaseQuery;
const SignalUpdate = require(`${__dirname}/../../../analysis/signals-query/signal-update`).SignalUpdate;
const User = require(`${__dirname}/../../../user/user.js`).User;
const ProxyHandler = require(`${__dirname}/../../proxy.js`).ProxyHandler;

var SureAboutSignal = {
	AllSignalLevel: [
		'opening',
		'open',
		'target-1',
		'target-2',
		'target-3',
		'target-4',
		'target-5',
		'target-6',
		'target-7',
		'target-8',
		'target-10',
		'target-11'
	],

	FindRealSignalStatus: (UsersSignal) => {
		var SignalStatus;
		var SignalLevel;

		return new Promise((Resolve, Reject) => {
			UsersSignal.map((UserData, UserDataIndex) => {
				if (UserData.Signal.PositionStatus === 'take_profit' || UserData.Signal.PositionStatus === 'stoploss') {
					SignalStatus = UserData.Signal.PositionStatus;
				} else if (/[open]|[opening]|target-[0-9]/i.test(UserData.Signal.PositionStatus)) {
					if (SignalStatus != 'stoploss' || SignalStatus != 'take_profit') {
						var CurrentSignalLevel =
							SureAboutSignal.AllSignalLevel.indexOf(UserData.Signal.PositionStatus) + 1;

						if (CurrentSignalLevel > SignalLevel) SignalLevel = CurrentSignalLevel;
					}
				}

				if (UserDataIndex === UsersSignal.length - 1) {
					console.log(SignalStatus);

					if (SignalStatus != 'stoploss' || SignalStatus != 'take_profit')
						SignalStatus = SureAboutSignal.AllSignalLevel[SignalLevel];

					Resolve(SignalStatus);
				}
			});
		});
	},

	FuturesSure: async (ChatID) => {
		const UsersSignal = await User.GetSignalFromAllUser(ChatID);

		console.log(await SureAboutSignal.FindRealSignalStatus(UsersSignal));
	},

	SpotSure: async (ChatID) => {}
};

exports.SureAboutSignal = SureAboutSignal;
