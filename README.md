# Project Documentation: Binance Auto-Trading Bot with Telegram Integration

## Overview

This project encompasses a multi-functional bot system designed to seamlessly integrate with Telegram to read, analyze, and act upon trading signals. Additionally, it features an interface to manage users, their funds, and create manual trade signals separate from Telegram inputs. The core functionalities include:

- **Telegram Bot Integration**: For reading and analyzing trading signals.
- **User Management and Requests Dashboard**: A panel to manage user data and create manual trade requests.
- **Binance Trading Bot**: For executing trades based on signals through Binance, and managing those trades.

## Key Components

### 1. Telegram Bot Integration

The Telegram Bot is responsible for reading and processing trading signals from specific channels. It utilizes these signals to generate trades on Binance. This functionality includes:

- **Reading Signals**: The bot connects to predefined Telegram channels, reads trading signals, and parses them for actionable insights.
- **Creating Orders**: Using the parsed signal data, the bot can automatically generate orders on Binance.

### 2. User Management Panel

A user interface panel for administrators to:

- **Create Trade Requests**: Apart from Telegram signals, admin can create trade signals manually through the panel.
- **Manage Users**: Handle user registration, subscriptions, and second-level authentication.
- **Fund Management**: Admin can add or deduct funds from user accounts and manage other financial settings.

### 3. Binance Trading Bot

The bot integrates with Binance to execute and manage trades. Its capabilities include:

- **Executing Signals**: Automated trading based on signals from Telegram or admin panel.
- **Managing Open Positions**: Tracks open trades and their performances.
- **Calculating Quantities**: Uses predefined settings to compute trade quantities based on user balance and signal data.
- **Handling Different Exchange Types**: Supports both spot and futures trading on Binance.
- **Stop Loss and Take Profit Management**: Automated setting of stop loss and take profit orders based on the given signals.

## Detailed Functionality

### Telegram Signal Processing

This component fetches and processes signals from Telegram. Here is a glimpse of the code that does this:

```javascript
async GetSignal(ChatID) {
    try {
        var Signal = await DatabaseQuery.AsyncMakeDatabaseQuery({
            DBQueryMethod: 'Select',
            MethodData: {
                ModelName: 'exb-signals',
                SelectKeys: 'ChatID ChannelID ExchangeType Currency EnterPrice PositionOrderID ...',
                Where: { ChatID: ChatID }
            }
        });
        return Signal[1][0];
    } catch (ReturnError) {
        throw new Error(ReturnError);
    }
}
```
This code is responsible for querying the database to fetch the signal details based on the `ChatID`.

### Multi-User Trade Execution

When a new signal is received, the bot can execute trades for multiple users as follows:

```javascript
async MultiUserTrade(Signal, CurrencyPrice) {
    const UsersPack = await User.GetTradeUsers('Spot', Signal.Currency[1]);
    UsersPack.map((UserList, UserIndex) => {
        setTimeout(() => {
            UserList.map(async (UserItem) => {
                const Currency = `${Signal.Currency[0]}${Signal.Currency[1]}`;
                const Quantity = await this.CalculationQuantity(/* params */);
                const MarketStatus = await this.Market(Currency, Quantity, Signal.ChatID, UserItem.BinanceConnection);
                // Additional handling...
            });
        }, 1000);
    });
}
```
This function processes the trades for all users assigned to a specific trading signal, ensuring each user's parameters are respected.

### User Management & Signal Dashboard

**Route to fetch all signals**:

```javascript
Router.get('/system/signals', async (Request, Response) => {
    try {
        const Signals = await Signal.GetSignals(/* params */);
        var ReturnData = Signals.map(/* mapping logic */);
        return Response.json(ReturnData);
    } catch (ReturnError) {
        return Response.json([]);
    }
});
```

**Snippet to add trade signal manually**:

```javascript
Router.post('/system/sendforcesignal', async (Request, Response) => {
    try {
        const { EXType, EPFrom, EPTo, CFrom, CTo, T1, T2, T3, T4, T5, OT, CapitalText, StoplossText } = Request.body;
        var TargetsText = /* target text formation logic */;
        var TelegramMessage = `${EXType} ${CFrom}/${CTo} Enter price: ${EPFrom} ...`;
        FS.writeFileSync(/* file path */, TelegramMessage);
        let cmd = `python3 /* script path */`;
        let stdout = execSync(cmd);
        return Response.json(stdout.toString());
    } catch (Error) {
        return Response.json([]);
    }
});
```
Both of these snippets demonstrate how signals can be managed and manually inputted into the system.

### Binance Order Management

**Spot Trade Execution Example**:

```javascript
async Market(Currency, Quantity, ChatID, BinanceConnection) {
    try {
        const OrderStatus = await BinanceConnection.marketBuy(Currency, this.ScientificToDecimal(Quantity));
        // Execution logic...
    } catch (ReturnError) { /* error handling */ }
}
```

**Futures Close Position Example**:

```javascript
async ClosePosition(PositionType, Currency, Quantity, BinanceConnection) {
    var OrderType;
    var Options = {};
    Quantity = Quantity.toFixed(FuturesEXData[Currency].QuantityPrecision);
    if (PositionType === 'long') {
        OrderType = 'futuresMarketSell';
        Options = { positionSide: 'LONG', side: 'BUY' };
    } else if (PositionType === 'short') {
        OrderType = 'futuresMarketBuy';
        Options = { positionSide: 'SHORT', side: 'SELL' };
    }
    var OrderStatus = await BinanceConnection[OrderType](Currency, Number(Quantity), Options);
    return OrderStatus;
}
```

## Setting Up and Deployment

### Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **MongoDB**: A MongoDB instance (either local or cloud) for database operations.
- **Binance Account**: Binance API keys for spot and futures trading.

### Installation

1. Clone the repository
2. Install dependencies using npm:
   ```sh
   npm install
   ```
3. Configure environment variables in a `.env` file:
   ```sh
   DB_URI=<Your MongoDB URI>
   BINANCE_API_KEY=<Your Binance API Key>
   BINANCE_API_SECRET=<Your Binance API Secret>
   TELEGRAM_BOT_TOKEN=<Your Telegram Bot Token>
   ```

### Running the Application

1. Start the server:
   ```sh
   npm start
   ```
2. Ensure that the server is running correctly and the Telegram bot is connected and listening to the specified channels.

## Conclusion

This project is designed for automating trading operations and signal management using a robust integration between Telegram and Binance. The comprehensive system enables multiple user management while ensuring accurate and timely trades based on signals.

For more detailed information on specific functionalities or code, please refer to the relevant sections in the source code files.

---

*This documentation provides a comprehensive overview of the project's architecture, key features, and deployment steps. For precise technical information, refer to the code snippets and detailed sections provided*   .
