const SignalUpdate = require(`${__dirname}/../analysis/signals-query/signal-update`).SignalUpdate;

const Errors = require(`${__dirname}/../../../../storage/exchange-data/trade-errors.json`);

var HandleTradeError = HandleTradeError || {};

HandleTradeError = {
    SignalError: (Signal, ErrorCode) => {
        const ErrorText = Errors[ErrorCode.toString()];

        SignalUpdate.SignalError(Signal, ErrorText);
    }
};

exports.HandleTradeError= HandleTradeError;