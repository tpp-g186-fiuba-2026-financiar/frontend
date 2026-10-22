import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView } from '../data/useHoldingsView';
import { LEGAL_TEXT } from '../ui/Blocks';
import { longDate, pct, pct1, usd, usd0 } from '../format';
import {
    logReturns,
    modelLabel,
    portfolioSeries,
    valueAtRisk,
} from '../finance';
import { bestModelOf } from '../../utils/defaultModels';

const RISK_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};
const SIG: Record<string, string> = {
    alza: 'Alza',
    baja: 'Baja',
    neutral: 'Neutral',
};

// Informe para imprimir o guardar como PDF (window.print). En pantalla está
// oculto; el CSS de impresión oculta la app y muestra solo esto.
export default function Report() {
    const { user, history, compare, balanceHistory } = usePortfolio();
    const { rows, totalValue, totalCost, weekPct } = useHoldingsView();
    const v = valueAtRisk(logReturns(portfolioSeries(rows, history).values));
    const asOf = balanceHistory.length
        ? longDate(balanceHistory[balanceHistory.length - 1].date)
        : '—';

    return (
        <div className="nx-report" aria-hidden="true">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 20,
                }}
            >
                <div>
                    <div
                        style={{
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: '#2f6fd0',
                        }}
                    >
                        FINANCIAR
                    </div>
                    <h2>Informe de cartera</h2>
                    <div style={{ color: '#6e8a83' }}>
                        {user?.full_name} · perfil{' '}
                        {RISK_LABEL[user?.risk_profile ?? ''] ??
                            user?.risk_profile}{' '}
                        · datos al cierre del {asOf}
                    </div>
                </div>
                <div
                    style={{
                        textAlign: 'right',
                        color: '#6e8a83',
                        fontSize: 11,
                    }}
                >
                    Generado el {new Date().toLocaleDateString('es-AR')}
                    <br />
                    TP Profesional · FIUBA
                </div>
            </div>
            <div className="legal-box">
                <b>NO ES UNA RECOMENDACIÓN DE INVERSIÓN.</b> {LEGAL_TEXT}
            </div>
            <div className="kp">
                <div>
                    <small>Valor total</small>
                    <b>{usd0(totalValue)}</b>
                </div>
                <div>
                    <small>Semana</small>
                    <b className={(weekPct ?? 0) >= 0 ? 'pos' : 'neg'}>
                        {weekPct != null ? pct(weekPct) : '—'}
                    </b>
                </div>
                <div>
                    <small>Ganancia total</small>
                    <b className={totalValue >= totalCost ? 'pos' : 'neg'}>
                        {totalCost > 0
                            ? pct(((totalValue - totalCost) / totalCost) * 100)
                            : '—'}
                    </b>
                </div>
                <div>
                    <small>VaR 95% · 1 día</small>
                    <b>{v ? usd0(v.var95 * totalValue) : '—'}</b>
                </div>
            </div>
            <h4>1. Tenencias</h4>
            <table>
                <thead>
                    <tr>
                        <th>Acción</th>
                        <th className="r">Cantidad</th>
                        <th className="r">Último cierre</th>
                        <th className="r">Semana</th>
                        <th className="r">P&L</th>
                        <th className="r">Peso</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.ticker}>
                            <td>{r.ticker}</td>
                            <td className="r">{r.quantity}</td>
                            <td className="r">
                                {r.price != null ? usd(r.price) : '—'}
                            </td>
                            <td
                                className={`r ${(r.week ?? 0) >= 0 ? 'pos' : 'neg'}`}
                            >
                                {r.week != null ? pct(r.week) : '—'}
                            </td>
                            <td
                                className={`r ${(r.pnlPercentage ?? 0) >= 0 ? 'pos' : 'neg'}`}
                            >
                                {r.pnlPercentage != null
                                    ? pct(r.pnlPercentage)
                                    : '—'}
                            </td>
                            <td className="r">{pct1(r.share * 100)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h4>2. Qué dicen los modelos</h4>
            <table>
                <thead>
                    <tr>
                        <th>Acción</th>
                        <th>Señal</th>
                        <th className="r">Prob. de suba</th>
                        <th>Modelo con más aciertos</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const best = bestModelOf(compare[r.ticker]);
                        return (
                            <tr key={r.ticker}>
                                <td>{r.ticker}</td>
                                <td
                                    className={
                                        r.signal === 'alza'
                                            ? 'pos'
                                            : r.signal === 'baja'
                                              ? 'neg'
                                              : ''
                                    }
                                >
                                    {r.signal ? SIG[r.signal] : 'Sin datos'}
                                </td>
                                <td className="r">
                                    {r.prob != null
                                        ? `${Math.round(r.prob * 100)}%`
                                        : '—'}
                                </td>
                                <td>{best ? modelLabel(best) : '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p style={{ marginTop: 18, color: '#6e8a83', fontSize: 10.5 }}>
                Informe con fines informativos y educativos. No constituye
                asesoramiento financiero ni recomendación de inversión. Las
                estimaciones son probabilidades, no certezas.
            </p>
        </div>
    );
}
