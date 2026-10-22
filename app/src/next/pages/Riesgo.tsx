import { useMemo } from 'react';
import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView } from '../data/useHoldingsView';
import { Card, CardHead, Empty, Explain, PageHead, Tip } from '../ui/Blocks';
import { LineChart } from '../ui/Charts';
import { longDate, pct1, shortDate, usd0 } from '../format';
import {
    annualizedVol,
    correlation,
    drawdownSeries,
    logReturns,
    portfolioSeries,
    steppedReturns,
    valueAtRisk,
} from '../finance';

export default function Riesgo() {
    const { history } = usePortfolio();
    const { rows, totalValue } = useHoldingsView();

    const data = useMemo(() => {
        const { dates, values } = portfolioSeries(rows, history);
        if (values.length < 30) return null;
        const rets = logReturns(values);
        const v = valueAtRisk(rets);
        const dd = drawdownSeries(values).map((x) => x * 100);
        const mdd = Math.min(...dd);
        const mddAt = dates[dd.indexOf(mdd)] ?? dates[0];
        const weeks = steppedReturns(values, 5).map((x) => x * 100);
        const weekDates = dates.filter((_, i) => i >= 5 && i % 5 === 0);
        const tick = rows
            .filter((r) => (history[r.ticker]?.length ?? 0) > 30)
            .map((r) => r.ticker);
        const tr = Object.fromEntries(
            tick.map((t) => [
                t,
                logReturns(history[t].map((p) => p.close).slice(-253)),
            ]),
        );
        const corr = tick.map((a) =>
            tick.map((b) => (a === b ? 1 : correlation(tr[a], tr[b]))),
        );
        return {
            dates,
            rets,
            v,
            dd,
            mdd,
            mddAt,
            weeks,
            weekDates,
            worstWeek: weeks.length ? Math.min(...weeks) : 0,
            bestWeek: weeks.length ? Math.max(...weeks) : 0,
            vol: annualizedVol(rets),
            tick,
            corr,
        };
    }, [rows, history]);

    let pairs = '';
    if (data) {
        const strong: string[] = [];
        data.tick.forEach((a, i) =>
            data.tick.forEach((b, j) => {
                if (j > i && (data.corr[i][j] ?? 0) >= 0.6)
                    strong.push(`${a}-${b}`);
            }),
        );
        pairs = strong.slice(0, 4).join(', ');
    }

    return (
        <>
            <PageHead
                eyebrow="Riesgo"
                title="¿Cuánto podría perder?"
                sub="Las ganancias se ven solas; el riesgo hay que buscarlo. Esta pantalla responde tres preguntas: cuánto podrías perder en un mal día, qué tan fuerte fue la peor racha y si tus acciones te protegen unas a otras o caen todas juntas."
            />
            <Explain title="De dónde salen estos números y cómo leerlos">
                <p>
                    <b>Datos:</b> el precio de cierre de cada rueda de tus
                    acciones en BYMA (los traemos de Yahoo Finance), del último
                    año. Con eso armamos cuánto habría valido{' '}
                    <b>tu cartera de hoy</b> (las mismas cantidades) cada día de
                    ese año. No usa tus compras y ventas reales ni ningún modelo
                    de predicción: es estadística sobre precios pasados.
                </p>
                <p>
                    <b>Por qué te lo mostramos:</b> dos carteras pueden haber
                    ganado lo mismo y tener riesgos muy distintos. Saber cuánto
                    se puede mover la tuya te ayuda a decidir si te sentís
                    cómodo o si te conviene diversificar (ver Rebalanceo).
                </p>
                <ul>
                    <li>
                        <b>VaR</b> <Tip k="var" />: "en un día normal-malo, no
                        deberías perder más de esto".
                    </li>
                    <li>
                        <b>CVaR</b> <Tip k="cvar" />: "y si el día es realmente
                        malo, esto es lo que perdés en promedio".
                    </li>
                    <li>
                        <b>Drawdown</b> <Tip k="drawdown" />: la peor caída
                        desde un pico.
                    </li>
                    <li>
                        <b>Correlación</b> <Tip k="corr" />: si tus acciones se
                        mueven juntas, no estás tan diversificado como creés.
                    </li>
                </ul>
            </Explain>
            {!data ? (
                <Empty>
                    Necesitamos al menos un mes de precios de tus acciones para
                    calcular el riesgo.
                </Empty>
            ) : (
                <>
                    <div className="nx-grid" style={{ marginBottom: 16 }}>
                        <Card span="s3 nx-kpi" i={1}>
                            <div className="nx-label">
                                VaR 95% · 1 día <Tip k="var" />
                            </div>
                            <div className="nx-value nx-down">
                                {data.v ? usd0(data.v.var95 * totalValue) : '—'}
                            </div>
                            <div className="nx-plain">
                                19 de cada 20 días no perdés más que esto
                                {data.v ? ` (${pct1(data.v.var95 * 100)})` : ''}
                            </div>
                        </Card>
                        <Card span="s3 nx-kpi" i={2}>
                            <div className="nx-label">
                                CVaR 95% <Tip k="cvar" />
                            </div>
                            <div className="nx-value nx-down">
                                {data.v
                                    ? usd0(data.v.cvar95 * totalValue)
                                    : '—'}
                            </div>
                            <div className="nx-plain">
                                pérdida promedio en el peor día de cada 20
                            </div>
                        </Card>
                        <Card span="s3 nx-kpi" i={3}>
                            <div className="nx-label">
                                Peor caída <Tip k="drawdown" />
                            </div>
                            <div className="nx-value nx-down">
                                {pct1(data.mdd)}
                            </div>
                            <div className="nx-plain">
                                desde un máximo, en el último año
                            </div>
                        </Card>
                        <Card span="s3 nx-kpi" i={4}>
                            <div className="nx-label">
                                Cuánto se mueve <Tip k="vol" />
                            </div>
                            <div className="nx-value">
                                ±{pct1(data.vol * 100)}
                            </div>
                            <div className="nx-plain">
                                volatilidad anual: lo que suele subir o bajar en
                                un año
                            </div>
                        </Card>
                    </div>
                    <div className="nx-grid">
                        <Card i={5}>
                            <CardHead
                                title="¿Tus acciones se mueven juntas?"
                                hint={`Correlación de los rendimientos diarios del último año: 1 = se mueven igual, 0 = no tienen relación, negativo = cuando una sube la otra tiende a bajar. Cuanto más intenso el color, más se mueven juntas.${pairs ? ` Las que más van de la mano: ${pairs}. Tenerlas a todas no diversifica tanto como parece.` : ''}`}
                            />
                            <div style={{ overflowX: 'auto' }}>
                                <div
                                    className="nx-heat"
                                    style={{
                                        gridTemplateColumns: `44px repeat(${data.tick.length}, minmax(26px, 1fr))`,
                                        minWidth: 420,
                                    }}
                                >
                                    <span />
                                    {data.tick.map((t) => (
                                        <span className="h" key={t}>
                                            {t}
                                        </span>
                                    ))}
                                    {data.tick.map((a, i) => [
                                        <span
                                            className="h"
                                            key={`h${a}`}
                                            style={{
                                                justifyContent: 'end',
                                                paddingRight: 6,
                                            }}
                                        >
                                            {a}
                                        </span>,
                                        ...data.tick.map((b, j) => {
                                            const c = data.corr[i][j] ?? 0;
                                            return (
                                                <span
                                                    key={`${a}${b}`}
                                                    className="c"
                                                    title={`${a} · ${b}: ${c.toFixed(2)}`}
                                                    style={{
                                                        animationDelay: `${(i * data.tick.length + j) * 4}ms`,
                                                        background: `color-mix(in oklab, ${c >= 0 ? 'var(--nx-accent)' : 'var(--nx-down)'} ${Math.round(Math.abs(c) * 85)}%, var(--nx-panel-2))`,
                                                    }}
                                                >
                                                    {i === j
                                                        ? ''
                                                        : Math.abs(c) < 0.05
                                                          ? '0'
                                                          : c
                                                                .toFixed(1)
                                                                .replace(
                                                                    '.',
                                                                    ',',
                                                                )}
                                                </span>
                                            );
                                        }),
                                    ])}
                                </div>
                            </div>
                        </Card>
                        <Card span="s5" i={6}>
                            <CardHead
                                title="La peor racha del año"
                                hint={
                                    <>
                                        Imaginá el valor más alto que tuvo tu
                                        cartera. La línea dice, cada día, cuánto
                                        menos valía respecto de ese récord.{' '}
                                        <Tip k="drawdown" />
                                    </>
                                }
                            />
                            <p className="nx-src" style={{ marginBottom: 10 }}>
                                El pozo más hondo fue {pct1(data.mdd)}, el{' '}
                                {longDate(new Date(data.mddAt))}: ese día tu
                                cartera valía {pct1(Math.abs(data.mdd))} menos
                                que en su pico. 0% = estaba en su máximo.
                            </p>
                            <LineChart
                                ariaLabel="Caídas desde el máximo"
                                height={260}
                                labels={data.dates.map((d) =>
                                    new Date(d).toISOString(),
                                )}
                                xFmt={shortDate}
                                tipFmt={longDate}
                                yFmt={(v) => v.toFixed(0) + '%'}
                                series={[
                                    {
                                        label: 'Debajo del pico',
                                        values: data.dd,
                                        color: 'var(--nx-down)',
                                        area: true,
                                    },
                                ]}
                            />
                        </Card>
                        <Card span="s7" i={7}>
                            <CardHead
                                title="Cada semana, ¿cuánto se movió?"
                                hint="Cada punto es una semana hábil (5 ruedas). Arriba de 0 = tu cartera subió esa semana; abajo = bajó. Semanas muy largas (para arriba o para abajo) = período nervioso."
                            />
                            <p className="nx-src" style={{ marginBottom: 10 }}>
                                La peor semana: {pct1(data.worstWeek)}. La
                                mejor: {pct1(data.bestWeek)}. Si casi todas van
                                para el mismo lado, tus acciones se mueven
                                juntas: el cuadro de colores de arriba lo
                                confirma.
                            </p>
                            <LineChart
                                ariaLabel="Variación semanal de la cartera"
                                height={260}
                                labels={data.weekDates.map((d) =>
                                    new Date(d).toISOString(),
                                )}
                                xFmt={shortDate}
                                tipFmt={longDate}
                                yFmt={(v) =>
                                    (v >= 0 ? '+' : '') + v.toFixed(0) + '%'
                                }
                                hline={0}
                                series={[
                                    {
                                        label: 'Semanas que subió',
                                        values: data.weeks.map((w) =>
                                            w > 0 ? w : 0,
                                        ),
                                        color: 'var(--nx-up)',
                                        area: true,
                                    },
                                    {
                                        label: 'Semanas que bajó',
                                        values: data.weeks.map((w) =>
                                            w < 0 ? w : 0,
                                        ),
                                        color: 'var(--nx-down)',
                                        area: true,
                                    },
                                ]}
                            />
                        </Card>
                    </div>
                </>
            )}
        </>
    );
}
