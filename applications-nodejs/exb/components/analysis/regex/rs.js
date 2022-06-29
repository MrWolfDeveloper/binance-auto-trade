var Regex = Regex || {};

Regex = {
    ExchangeType: /(?:BinanceSpot|BinanceFutures(.*))$/m,
    Currency: /\#(.*)/gm,
    EnterPrice: /Enterprice:(.*)/gm,
    Targets: /Target:(.*)/gm,
    OpenTargets: /(?:OpenTargets:|OpenTarget:)[ ]?[\n]?[ ]?(.*)/gm,
    Capital: /⚠️(.*)/gm,
    StopLoss: /(⛔️|⛔)[ ]?(.*)[ ]?\n[ ]?(.*)/gm,
    ManualStopLoss: /(?:below|above)(.*)/gm,
    NormalStopLoss: /normalstoploss:[ ]?[\n]?(.*)/gm,
    ForceStop: /forcestop/gim
};

exports.Regex = Regex;
