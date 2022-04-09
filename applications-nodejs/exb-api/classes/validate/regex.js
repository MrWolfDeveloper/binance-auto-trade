var Regex = Regex || {};

// Regex Library
Regex = {
	LessThan: '^[a-zA-ZäöüÄÖÜß0-9]{_From,_To}$',
	Between: '^.{_From,_To}$',
	Username: /^[a-z0-9_-].{2,16}$/g, // Alphanumeric string that may include _ and – having a length of 3 to 16 characters. - Must Be Lower Case
	UserPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[#$^+=!*()@%&_-]).{8,20}$/g, // e.g Anj1G@de Anj1G@lf
	PersonName: /^[a-zA-ZäöüÄÖÜß]+(([",. -][a-zA-ZäöüÄÖÜß ])?[a-zA-ZäöüÄÖÜß]*)*$/gm,
	WebSite: /^(https?:\/\/)?(www\.)?([a-zA-Z0-9]+(-?[a-zA-Z0-9])*\.)+[\w]{2,}(\/\S*)?$/gm,
	Email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	PhoneNumber: /(([+][(]?[0-9]{1,3}[)]?)|([(]?[0-9]{4}[)]?))\s*[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?([-\s\.]?[0-9]{3})([-\s\.]?[0-9]{3,4})/g,
	Premalink: /^([a-z0-9\-]{1,}[a-z0-9\-\/]*)$/i,
	ContactPhone: /(([+][(]?[0-9]{1,3}[)]?)|([(]?[0-9]{4}[)]?))\s*[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?([-\s\.]?[0-9]{3})([-\s\.]?[0-9]{3,4})/g,
	Address: /^[#.0-9a-zA-ZäöüÄÖÜß\s,-]+$/g,
	ZipCode: /^[0-9]{5}(?:-[0-9]{4})?$/g,
	JWTToken: /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/,
	TelegramCommand: /\/[a-z]{2,16}/g,
	BinanceAPI: /[a-zA-Z0-9]{60,70}/g,
	OkexAPIKey: /[a-z0-9-]{30,40}/g,
	OkexAPISecret: /[A-Z0-9]/g,
	NumberRange: /(?:[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?:[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?|all)/i,
	DateRange: /(([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])):([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))|all)/i,
	Currency: /[a-zA-Z]{3,6}_[a-zA-Z]{3,6}/i,
	InvoiceID: /^[0-9]{1,6}\/(19|20)\d{2}$/i // A 1 to 6 digit number(/)Full year validate from 1900 to 2099
};

exports.Regex = Regex;
