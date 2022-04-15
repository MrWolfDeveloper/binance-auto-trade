const FS = require('fs');

const LoadChannelData = require('../files/load-channel-data').LoadChannelData;
const SignalsImport = require('../analysis/signals-query/signal-import').SignalsImport;

/* ----------------------------- Analysis objects ----------------------------- */
const LoadAnalysisFiles = require('../analysis/load');
const Load = new LoadAnalysisFiles();
const RequireObjects = Load.ImportObject([ 'RastadSignals', 'exbforcesignal', 'BinanceKillers' ]);

var SignalWatcher = SignalWatcher || {};

SignalWatcher = {
	AddWatcherToFiles: (SignalFilesName) => {
		try {
			var SignalFileStatus = {};

			SignalFilesName.forEach((SignalFile) => {
				SignalFileStatus[SignalFile] = { FSTimeout: null };
			});

			FS.watch(`${__dirname}/../../../../storage/channel-data/`, (Event, FileName) => {
				if (Event === 'change') {
					setTimeout(async () => {
						FileName = FileName.replace('.json', '');

						if (SignalFilesName.indexOf(FileName) != -1 && !SignalFileStatus[FileName].FSTimeout) {
							SignalFileStatus[FileName].FSTimeout = setTimeout(function() {
								SignalFileStatus[FileName].FSTimeout = null;
							}, 5000);

							const FilesPath = LoadChannelData.ChannelsPath([ FileName ]);

							var FilesContent = LoadChannelData.LoadChannelsDataFile(FilesPath);

							FilesContent[0].Data = [ FilesContent[0].Data[FilesContent[0].Data.length - 1] ];

							const ImportData = RequireObjects[FileName.replace(/ /i, '')].AnalysisContent(FilesContent);

							await SignalsImport.AddSignals(ImportData);
						}
					}, 2000);
				}
			});
		} catch (AWTFError) {}
	}
};

exports.SignalWatcher = SignalWatcher;
