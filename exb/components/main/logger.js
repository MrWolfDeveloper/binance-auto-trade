var Logger = Logger || {};

Logger = {
	info: (Message, Path = null) => {
		const Now = new Date(Date.now());
		console.log(`[ ${Now.toString()} ] [ ${Path} ] `, Message);
	},

	error: (Message, Path = null) => {
		const Now = new Date(Date.now());
		console.error(`[ ${Now.toString()} ] [ ${Path} ] `, Message);
	}
};

exports.Logger = Logger;
