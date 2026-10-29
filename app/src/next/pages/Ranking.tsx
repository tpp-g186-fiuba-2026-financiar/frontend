import { useNavigate } from 'react-router-dom';
import { useRemote } from '../data/useRemote';
import { usePortfolio } from '../data/PortfolioContext';
import { getRankingEndpoint } from '../../api/next/endpoints';
import {
    Card,
    CardHead,
    Empty,
    Explain,
    Legal,
    PageHead,
    SignalPill,
    Tip,
} from '../ui/Blocks';

export default function Ranking() {
    const navigate = useNavigate();
    const { holdings } = usePortfolio();
    const mias = new Set(holdings.map((h) => h.ticker));
    const ranking = useRemote('ranking', getRankingEndpoint);
    const filas = ranking.data?.acciones ?? [];

    return (
        <>
            <PageHead
                eyebrow="Ranking del día"
                title="Las acciones del panel, de más a menos chances de suba"
                sub={`Según XGBoost, a ${ranking.data?.horizon_days ?? 20} ruedas. El puntaje de 1 a 10 es el puesto de cada acción frente a las demás hoy.`}
            />
            <Legal />
            <Explain title="Cómo leer este ranking">
                <ul>
                    <li>
                        <b>Qué es:</b> las acciones del panel ordenadas por las
                        chances de suba que les da XGBoost hoy. Arriba, las que
                        en situaciones parecidas más seguido terminaron más
                        arriba 20 ruedas después.
                    </li>
                    <li>
                        <b>Puntaje:</b> el puesto convertido a 1–10. Un 10 está
                        entre las mejores del día; un 1, entre las peores. Es
                        relativo: compara contra las otras, no contra cero.
                    </li>
                    <li>
                        <b>Señal:</b> el 20% de arriba es alza, el 20% de abajo
                        es baja, el resto neutral.
                    </li>
                    <li>
                        <b>Ojo:</b> comprar solo las de arriba no le ganó al
                        panel después de comisiones. Sirve para mirar, no es una
                        lista de compras.
                    </li>
                </ul>
            </Explain>
            {ranking.loading && (
                <Empty>Armando el ranking con las acciones del panel…</Empty>
            )}
            {ranking.error && (
                <Empty>
                    No pudimos armar el ranking ahora. Probá más tarde.
                </Empty>
            )}
            {filas.length > 0 && (
                <Card i={1}>
                    <CardHead
                        title={`${filas.length} acciones del panel líder`}
                        hint={`Datos al ${filas[0].as_of}. Tocá una fila para ver el análisis completo.`}
                    />
                    <div className="nx-table-wrap">
                        <table className="nx-table nx-ranking">
                            <thead>
                                <tr>
                                    <th className="r">#</th>
                                    <th>Acción</th>
                                    <th>Puntaje</th>
                                    <th className="r">
                                        Chances de suba <Tip k="prob" />
                                    </th>
                                    <th>
                                        Señal <Tip k="senal" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((f) => (
                                    <tr
                                        key={f.symbol}
                                        onClick={() =>
                                            navigate(`/accion/${f.symbol}`)
                                        }
                                        tabIndex={0}
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            navigate(`/accion/${f.symbol}`)
                                        }
                                        aria-label={`Ver ${f.symbol}`}
                                    >
                                        <td className="r nx-mono">
                                            {f.puesto}
                                        </td>
                                        <td>
                                            <b className="nx-ink">{f.symbol}</b>
                                            {mias.has(f.symbol) && (
                                                <span className="nx-mine">
                                                    en tu cartera
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className="nx-score"
                                                aria-label={`Puntaje ${f.puntaje} de 10`}
                                            >
                                                {Array.from(
                                                    { length: 10 },
                                                    (_, k) => (
                                                        <i
                                                            key={k}
                                                            className={
                                                                k < f.puntaje
                                                                    ? 'on'
                                                                    : ''
                                                            }
                                                        />
                                                    ),
                                                )}
                                                <b>{f.puntaje}</b>
                                            </span>
                                        </td>
                                        <td className="r nx-mono">
                                            {Math.round(f.probability_up * 100)}
                                            %
                                        </td>
                                        <td>
                                            <SignalPill signal={f.signal} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </>
    );
}
