function GetData(MethodName) {
    const Columns = {
        Signals: [
            { data: 'ExchangeType' },
            { data: 'ChatID' },
            { data: 'Currency' },
            { data: 'EnterPrice' },
            { data: 'Targets' },
            { data: 'OpenTargets' },
            { data: 'Capital' },
            { data: 'SignalDate' },
            { data: 'ForceStop' }
        ],
        Users: [
            { data: 'Username' },
            { data: 'Email' },
            { data: 'PhoneNumber' },
            { data: 'UseFreePlan' },
            { data: 'PlanStartDate' },
            { data: 'PlanEndDate' },
            { data: 'AccountStatus' },
            { data: 'Signals' },
            { data: 'TradeSpan' },
            { data: 'ExchangesData' },
            { data: 'Action' }
        ]
    };

    $(`#${MethodName}Table`).DataTable({
        ajax: {
            url: APIURLS[MethodName],
            dataSrc: ''
        },
        destroy: true,
        columns: Columns[MethodName],
        order: [ [ 7, 'desc' ] ]
    });
}

function ForceStop(ChatID) {
    $('.button-primary').prop('disabled', true);
    $(`button#${ChatID}`).html('Stopping ...');

    $.ajax({
        url: `/forcestop/${ChatID}`
    }).done((Data) => {
        // GetData('OpenPositions');
    });
}
