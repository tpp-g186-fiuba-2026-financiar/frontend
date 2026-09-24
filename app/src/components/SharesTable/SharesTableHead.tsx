import InfoTip from '../Layout/InfoTip';
import {
    pylInfo,
    rsiInfo,
    signalInfo,
    modelInfo,
} from './variablesDescriptions';

function SharesTableHead() {
    return (
        <tr>
            <th>Ticker</th>
            <th></th>
            <th>Cant.</th>
            <th>
                P&L
                <InfoTip label="P&L">{pylInfo}</InfoTip>
            </th>
            <th>Último</th>
            <th>
                RSI
                <InfoTip label="RSI (14)">{rsiInfo}</InfoTip>
            </th>
            <th>
                Señal
                <InfoTip label="Señal">{signalInfo}</InfoTip>
            </th>
            <th>
                Modelo · fecha
                <InfoTip label="Modelo · fecha">{modelInfo}</InfoTip>
            </th>
            <th></th>
        </tr>
    );
}

export default SharesTableHead;
