const HandleTradeError = require(__dirname + '/handle-trade-errors.js').HandleTradeError;

HandleTradeError.SignalError({
    ChatID: 'rs-3661',
    ExchangeType: [ 'binance-futures', 'long' ],
    Currency: [ 'BTC', 'USDT' ],
    EnterPrice: [ '53300', '54000' ],
    Targets: [ '54666', '55480', '57400', '59601' ],
    OpenTargets: [ '61633', '63994' ],
    Capital: { Percentage: '2', Leverage: 'isolated', Range: [5, 8] },
    StopLoss: { CandleSide: 'above', Type: 'normal', Number: '52300' },
    ForceStop: 'not-set',
    PositionStatus: 'opening'
}, -7001);