// Add Regex Library File (Add Your Regex To This File)
var RegexLibrary = require('./regex.js').Regex;

var Validate = Validate || {};

Validate = {
	AsyncDictionaryObjectKeyRegexCheck: (Data) => {
		return new Promise((Resolve, Reject) => {
			if (typeof Data === 'object') {
				var i = 0;
				var FilteredData = Object.keys(Data).reduce(function(Filtered, Key) {
					var Regex = RegexLibrary[Data[Key].Regex.Name];

					// Replace Referred Regex Value In Data[Key] In Regex
					if (Data[Key].Regex.Values) {
						for (var RegexValueItem in Data[Key].Regex.Values) {
							Regex = Regex.replace(RegexValueItem.toString(), Data[Key].Regex.Values[RegexValueItem]);
						}
					}

					Regex = new RegExp(Regex, 'gm');

					// Regex Test VariableValue
					if (!Regex.test(Data[Key].VariableValue)) {
						Filtered[i] = Data[Key].VariableKey;
						i++;
					}

					return Filtered;
				}, []);

				return Resolve([ true, FilteredData ]);
			}

			Reject([ false, {}, 'Data Must Be A Array of Dictionary Objects' ]);
		});
	}
};

exports.Validate = Validate;
