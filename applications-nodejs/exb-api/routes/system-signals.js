const FS = require('fs');
const { execSync } = require('child_process');

const Express = require('express');
const Router = Express.Router();

const Signal = require(`${__dirname}/../classes/system/signal/signal.js`).Signal;

// Load all signals
Router.get('/system/signals', async (Request, Response) => {
    try {
        const Signals = await Signal.GetSignals(
            {},
            'ChatID ExchangeType Currency EnterPrice Targets OpenTargets Capital SignalDate PositionStatus'
        );

        var ReturnData = Signals.map((Signal) => {
            if (Signal.PositionStatus === 'forcestop') var ForceStopBTN = `<h5 style="color: #DF5E5E">Stopped</h5>`;
            else
                var ForceStopBTN = `<button style="background-color: #DF5E5E; border-color: #DF5E5E;" onclick="ForceStopModal('${Signal.ChatID}')" id="${Signal.ChatID}" class="button-primary">Force stop</button>`;

            return {
                ExchangeType: Signal.ExchangeType.join(' ').toUpperCase(),
                ChatID: Signal.ChatID,
                Currency: Signal.Currency.join(' / '),
                EnterPrice: Signal.EnterPrice.join(',<br> '),
                Targets: Signal.Targets.join(',<br> '),
                OpenTargets: Signal.OpenTargets.join(',<br> '),
                Capital: `${Signal.Capital.Percentage} %`,
                SignalDate: Signal.SignalDate,
                ForceStop: ForceStopBTN
            };
        });

        return Response.json(ReturnData);
    } catch (ReturnError) {
        console.error(ReturnError, '/system/signals');

        return Response.json([]);
    }
});

Router.post('/system/sendforcesignal', async (Request, Response) => {
    try {
        const { EXType, EPFrom, EPTo, CFrom, CTo, T1, T2, T3, T4, T5, OT, CapitalText, StoplossText } = Request.body;

        var TargetsText = `\n\n`;
        if (T1 != '') TargetsText += `1\ufe0f\u20e3 Target: ${T1}\n\n`;
        if (T2 != '') TargetsText += `2\ufe0f\u20e3 Target: ${T2}\n\n`;
        if (T3 != '') TargetsText += `3\ufe0f\u20e3 Target: ${T3}\n\n`;
        if (T4 != '') TargetsText += `4\ufe0f\u20e3 Target: ${T4}\n\n`;
        if (T5 != '') TargetsText += `5\ufe0f\u20e3 Target: ${T5}\n\n`;
        if (OT != '') TargetsText += `5\ufe0f\u20e3 Open Targets:\n${OT}\n\n`;

        var TelegramMessage = `${EXType}\n\n\ud83d\udcf6 #${CFrom}/${CTo}\n\n\ud83d\udcc8Enter price: ${EPFrom} \ud83d\udd1b ${EPTo}${TargetsText}\u26d4\ufe0f ${StoplossText}\n\n\u26a0\ufe0f ${CapitalText}\n\n\ud83d\udcb8 @EXBForceSignal EXB Panel By *MrWolf* \ud83d\udcb8`;

        FS.writeFileSync(`${__dirname}/../classes/telegram/send-message.txt`, TelegramMessage);

        let cmd = `python3 ${__dirname}/../classes/telegram/send-channel-message.py`;
        let stdout = execSync(cmd);
        console.log(stdout.toString());
        // exec(`python3 ${__dirname}/../classes/telegram/send-channel-message.py`, (err, stdout, stderr) => {
        //     // if (err) {
        //     //     console.log(`stderr: ${stderr}`);
        //     //     // node couldn't execute the command
        //     //     return;
        //     // }

        //     // the *entire* stdout and stderr (buffered)
        //     console.log(`stdout: ${stdout}`);
        //     console.log(`stderr: ${stderr}`);
        // });

        return Response.json({ status: true });
    } catch (ReturnError) {
        console.error(ReturnError, '/system/sendforcesignal');

        return Response.json({ status: false });
    }
});

module.exports = Router;
