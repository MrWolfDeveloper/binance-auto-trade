const Request = require('request');
const FS = require('fs');
const Binance = new (require('node-binance-api'))().options({
    APIKEY: '5LmRj72iyRBlN7JRG834NkW0RHmr5OMeMiOSa4mLHrIAYM3LVVv5OOZBDGDZZg9K',
    APISECRET:
        'L5Ff4Da4x8aWNsUKeDsVvilMT23l79x48kImJb1gRwqWY2LOZZME4hw2BXKxQyxM'
});

const Precision = (Amount) => {
    Amount = parseFloat(Amount);
    var e = 1;
    while (Math.round(Amount * e) / e !== Amount) e *= 10;
    return Math.ceil(Math.log(e) / Math.LN10);
};

const SaveData = (FileName, SaveData) => {
    FS.writeFileSync(
        `${__dirname}/../../../storage/exchange-data/${FileName}.json`,
        JSON.stringify(SaveData)
    );
};

const SpotStructureData = (UnstructuredData) => {
    var Output = {};

    UnstructuredData.symbols.map((Item) => {
        var FilteredPrice = Item.filters.filter((ItemIn) => {
            return ItemIn.filterType === 'PRICE_FILTER';
        });

        var FilteredLOT = Item.filters.filter((ItemIn) => {
            return ItemIn.filterType === 'LOT_SIZE';
        });

        var FilteredPercent = Item.filters.filter((ItemIn) => {
            return ItemIn.filterType === 'PERCENT_PRICE';
        });

        Output[Item.symbol] = {
            QuantityPrecision: Precision(FilteredLOT[0].minQty),
            PricePrecision: Precision(FilteredPrice[0].minPrice),
            MinQuantity: FilteredLOT[0].minQty,
            MaxQuantity: FilteredLOT[0].maxQty,
            PercentPrice: {}
        };

        if (FilteredPercent.length) {
            Output[Item.symbol].PercentPrice = {
                MultiplierDown: FilteredPercent[0].multiplierDown,
                MultiplierUp: FilteredPercent[0].multiplierUp
            };
        }
    });

    return Output;
};

const FuturesStructureData = (UnstructuredData) => {
    return new Promise((Resolve, Reject) => {
        var Output = {};
        UnstructuredData.symbols.map((Item, Index) => {
            var FilteredLOT = Item.filters.filter((ItemIn) => {
                return ItemIn.filterType === 'LOT_SIZE';
            });
            var FilteredPercent = Item.filters.filter((ItemIn) => {
                return ItemIn.filterType === 'PERCENT_PRICE';
            });
            var PriceFilter = Item.filters.filter((ItemIn) => {
                return ItemIn.filterType === 'PRICE_FILTER';
            });

            Output[Item.symbol] = {
                QuantityPrecision: Item.quantityPrecision,
                PricePrecision: Item.pricePrecision,
                MinQuantity: FilteredLOT[0].minQty,
                MaxQuantity: FilteredLOT[0].maxQty,
                TickSize: Precision(PriceFilter[0].tickSize),
                PercentPrice: {
                    MultiplierDecimal: FilteredPercent[0].multiplierDecimal,
                    MultiplierDown: FilteredPercent[0].multiplierDown,
                    MultiplierUp: FilteredPercent[0].multiplierUp
                }
            };

            if (Index === UnstructuredData.symbols.length - 1) Resolve(Output);
        });
    });
};

const SpotGetExchangeInfo = () => {
    return new Promise((Resolve, Reject) => {
        Request(
            'https://api.binance.com/api/v3/exchangeInfo',
            (ReturnError, Response, Body) => {
                // console.log(ReturnError);
                // console.log(Response);
                // console.log(Body);
                if (ReturnError) Reject(ReturnError);

                Resolve(JSON.parse(Body));
            }
        );
    });
};

const GetExchangeInfoFutures = async () => {
    return await Binance.futuresExchangeInfo();
    // console.log((await Binance.futuresExchangeInfo()).symbols[0]);
};

async function SpotOperation() {
    try {
        const SpotStructuredExchangeInfo = SpotStructureData(
            await SpotGetExchangeInfo()
        );

        SaveData('symbol-data-spot', SpotStructuredExchangeInfo);

        return;
    } catch (ReturnError) {
        console.error(ReturnError);
        console.log('Retyring spot ...');

        await SpotOperation();
    }
}

async function FuturesOperation() {
    try {
        const FuturesStructuredExchangeInfo = await FuturesStructureData(
            await GetExchangeInfoFutures()
        );

        SaveData('symbol-data-futures', FuturesStructuredExchangeInfo);

        return;
    } catch (ReturnError) {
        console.error(ReturnError);
        console.log('Retyring futures ...');

        await FuturesOperation();
    }
}

// Update spot
setInterval(async () => {
    await SpotOperation();
}, 43200000);

// Update futures
setInterval(async () => {
    await FuturesOperation();
}, 43200000);

(async () => {
    await SpotOperation();
    await FuturesOperation();
})();
