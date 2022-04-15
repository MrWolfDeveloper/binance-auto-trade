// const CronJob = require(__dirname + '/chart-listener');

// const CronJobOBJ = new CronJob();

// CronJobOBJ.AddCandleListener('BTCUSDT', '1m');

const CronJob = require('cron').CronJob;

try {
	// var Job = new CronJob({
	// 	cronTime: '0/1 * * * *',
	// 	onTick: function() {

	// 	},
	// 	utcOffset: 0
	// });

	const Job = new CronJob('0 */1 * * * *', function() {
		const d = new Date(Date.now());
	});
} catch (ReturnError) {}
