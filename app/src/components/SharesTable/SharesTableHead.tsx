import InfoTip from '../Layout/InfoTip';
import './variablesDescriptions';
function SharesTableHead() {
    return (
        <tr>
            <th>Ticker</th>
            <th></th>
            <th>Cant.</th>
            <th>
                P&L
                <InfoTip label="P&L">variablesDescriptions.pylInfo</InfoTip>
            </th>
            <th>Último</th>
            <th>
                RSI
                <InfoTip label="RSI (14)">
                    variablesDescriptions.rsiInfo
                </InfoTip>
            </th>
            <th>
                Señal
                <InfoTip label="Señal">
                    variablesDescriptions.signalInfo
                </InfoTip>
            </th>
            <th>
                Modelo · fecha
                <InfoTip label="Modelo · fecha">
                    variablesDescriptions.modelInfo
                </InfoTip>
            </th>
            <th></th>
        </tr>
    );
}

export default SharesTableHead;
