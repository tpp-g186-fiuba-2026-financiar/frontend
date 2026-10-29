import { Card, CardHead, PageHead } from '../../ui/Blocks';

// Explicacion de la recomendacion de cartera. Los valores salen de
// api-ml/src/black_litterman/black_litterman.py y optimizador.py.

const PASOS = [
    {
        n: 1,
        titulo: 'Cuánto se mueven juntas las acciones (Σ)',
        simple: 'Con los precios del último tiempo se mide cuánto se mueve cada acción y cuánto se mueven juntas. Si dos acciones suben y bajan a la par, tener las dos no reparte el riesgo.',
        cuenta: 'Σ = covarianza de los retornos diarios × 5 (llevada al horizonte de 5 ruedas). La volatilidad de cada acción se reemplaza por la que estima GARCH, manteniendo las correlaciones.',
        nuestro:
            '750 ruedas de historia; una acción con menos de 60 ruedas queda afuera.',
    },
    {
        n: 2,
        titulo: 'Qué "descuenta" tu cartera hoy (Π)',
        simple: 'Se hace la cuenta al revés: si tu cartera actual fuera la óptima, ¿qué retorno tendría que esperar cada acción? Ese es el punto de partida, y sin otra información la recomendación es quedarse como estás.',
        cuenta: 'Π = δ · Σ · w_ancla, con w_ancla los pesos de hoy y δ la aversión al riesgo del mercado.',
        nuestro:
            'δ = 2,5 (valor de referencia de la literatura). Ancla: tu cartera (también se puede usar pesos iguales o el mercado).',
    },
    {
        n: 3,
        titulo: 'Qué opinan los modelos (Q y Ω)',
        simple: 'Para cada acción, el modelo de tendencia dice cuánto espera que suba o baje. Esa es la "vista". También hay que decir cuánto le creemos.',
        cuenta: 'Q = retorno predicho a 5 ruedas por acción. Ω (la duda sobre cada vista) = τ · Σ_ii · (1 − c) / c, donde c es la confianza.',
        nuestro:
            'c = 5%: los modelos casi no predicen a 5 ruedas (aciertan ~50–53% en vivo), así que se les cree poco. Modelo: el que esté por defecto o el que elija el usuario.',
    },
    {
        n: 4,
        titulo: 'Mezclar las dos cosas (μ)',
        simple: 'El retorno final esperado de cada acción es un promedio entre el punto de partida y la opinión del modelo, pesado por cuánto confiamos en cada uno.',
        cuenta: 'μ = [(τΣ)⁻¹ + Ω⁻¹]⁻¹ · [(τΣ)⁻¹ Π + Ω⁻¹ Q]. Para una acción sola queda μ ≈ Π + c · (Q − Π).',
        nuestro:
            'τ = 0,05 (incertidumbre del punto de partida, valor habitual).',
    },
    {
        n: 5,
        titulo: 'Armar la cartera (w)',
        simple: 'Se busca la cartera que más retorno espera por cada unidad de riesgo, según tu perfil, pagando la comisión de lo que se compra o vende.',
        cuenta: 'maximizar μ·w − (aversión/2) · w′Σw − costo · Σ|w − w_hoy|, sin ventas en corto, sin apalancamiento (suma 1) y con un techo por acción.',
        nuestro:
            'Aversión: conservador 6, moderado 3, arriesgado 1,5. Techo: 15% / 20% / 30%. Costo 0,6% por punta, repartido en 63 ruedas (3 meses de tenencia).',
    },
    {
        n: 6,
        titulo: 'Qué acciones puede tocar',
        simple: 'No rearma toda la cartera: trabaja con tus acciones y puede sumar como mucho 2 nuevas, las de mejor retorno esperado por riesgo. Una nueva solo entra si le toca al menos un 3%.',
        cuenta: 'Universo = tus acciones + top 2 del panel por μ/σ. Pesos menores a 0,5% se redondean a 0.',
        nuestro:
            'max_nuevas = 2 (0 = solo redistribuir; "todas" = todo el panel).',
    },
];

const PARAMETROS: Array<[string, string, string]> = [
    ['τ (tau)', '0,05', 'Cuánto dudamos del punto de partida'],
    ['δ del mercado', '2,5', 'Para calcular Π desde tu cartera'],
    ['Confianza en los modelos', '5%', 'Cuánto se mueve μ desde Π hacia Q'],
    [
        'Aversión al riesgo',
        '6 / 3 / 1,5',
        'Conservador / moderado / arriesgado',
    ],
    [
        'Techo por acción',
        '15% / 20% / 30%',
        'Conservador / moderado / arriesgado',
    ],
    [
        'Costo de operar',
        '0,6% por punta',
        'Comisión, derechos, IVA y spread en BYMA',
    ],
    ['Tenencia supuesta', '63 ruedas', 'Para repartir la comisión (3 meses)'],
    ['Acciones nuevas', 'hasta 2', 'Y solo si les toca 3% o más'],
    ['Historia', '750 ruedas', 'Mínimo 60 por acción'],
];

export default function BlackLitterman() {
    return (
        <>
            <PageHead
                eyebrow="Administración · Cómo arma la cartera"
                title="Black-Litterman, paso a paso"
                sub="Cómo sale la cartera recomendada de la pantalla Rebalanceo: qué datos usa, qué cuenta hace y por qué los números son los que son."
            />
            <div className="nx-grid">
                <Card span="s12" i={1}>
                    <CardHead title="En una frase" />
                    <p className="nx-bl-lead">
                        Arranca de <b>tu cartera de hoy</b>, la corre un poco
                        hacia lo que opinan los modelos (poco, porque predicen
                        poco) y la ajusta para <b>repartir mejor el riesgo</b>{' '}
                        según tu perfil. Solo propone mover plata si la mejora
                        esperada paga la comisión.
                    </p>
                    <div className="nx-bl-flow" aria-label="Flujo del cálculo">
                        <span>Precios → Σ</span>
                        <i>→</i>
                        <span>Tu cartera → Π</span>
                        <i>→</i>
                        <span>Modelos → Q</span>
                        <i>→</i>
                        <span>Mezcla → μ</span>
                        <i>→</i>
                        <span>Optimizador → cartera</span>
                    </div>
                </Card>
                {PASOS.map((p) => (
                    <Card key={p.n} span="s6" i={(p.n % 6) + 1}>
                        <div className="nx-bl-step">
                            <div className="nx-bl-step-n">{p.n}</div>
                            <h3>{p.titulo}</h3>
                            <dl>
                                <dt>En simple</dt>
                                <dd>{p.simple}</dd>
                                <dt>La cuenta</dt>
                                <dd className="nx-mono">{p.cuenta}</dd>
                                <dt>Nuestros valores</dt>
                                <dd>{p.nuestro}</dd>
                            </dl>
                        </div>
                    </Card>
                ))}
                <Card span="s6" i={2}>
                    <CardHead
                        title="Un ejemplo con números"
                        hint="Una acción sola, para ver la mezcla."
                    />
                    <ul className="nx-bl-list">
                        <li>
                            Tu cartera "descuenta" para GGAL <b>Π = +0,4%</b> a
                            5 ruedas.
                        </li>
                        <li>
                            El modelo dice <b>Q = +3,0%</b>.
                        </li>
                        <li>
                            Con confianza 5%: μ ≈ 0,4% + 0,05 × (3,0% − 0,4%) ={' '}
                            <b>+0,53%</b>.
                        </li>
                        <li>
                            La comisión de 0,6% repartida en 63 ruedas cuesta
                            0,6% × 5 / 63 ≈ <b>0,05%</b> a 5 ruedas: si mover
                            plata no mejora más que eso (ajustado por riesgo),
                            no se mueve.
                        </li>
                    </ul>
                </Card>
                <Card span="s6" i={3}>
                    <CardHead title="Parámetros" />
                    <div className="nx-table-wrap">
                        <table
                            className="nx-table"
                            aria-label="Parámetros de Black-Litterman"
                        >
                            <tbody>
                                {PARAMETROS.map(([k, v, d]) => (
                                    <tr key={k}>
                                        <td>{k}</td>
                                        <td className="nx-mono nx-ink">{v}</td>
                                        <td className="nx-muted">{d}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card span="s6" i={4}>
                    <CardHead
                        title="¿Funcionó en el pasado?"
                        hint="2017–2026, 40 carteras de 5 acciones al azar, rebalanceo mensual, 0,6% por punta, contra no tocar nada."
                    />
                    <div className="nx-table-wrap">
                        <table
                            className="nx-table"
                            aria-label="Backtest de Black-Litterman"
                        >
                            <thead>
                                <tr>
                                    <th>Perfil</th>
                                    <th className="r">Diferencia por año</th>
                                    <th className="r">
                                        Carteras que mejoraron
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Conservador</td>
                                    <td className="r nx-mono nx-up">+8,6%</td>
                                    <td className="r nx-mono">40 de 40</td>
                                </tr>
                                <tr>
                                    <td>Moderado</td>
                                    <td className="r nx-mono nx-up">+2,0%</td>
                                    <td className="r nx-mono">38 de 40</td>
                                </tr>
                                <tr>
                                    <td>Arriesgado</td>
                                    <td className="r nx-mono nx-down">−7,4%</td>
                                    <td className="r nx-mono">0 de 40</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="nx-bl-lead nx-muted">
                        La mejora viene de repartir el riesgo, no de las vistas:
                        sin los modelos da casi igual. El arriesgado concentra
                        en 2 o 3 acciones y eso no pagó.
                    </p>
                </Card>
                <Card span="s6" i={5}>
                    <CardHead title="Lo que cambiamos y por qué" />
                    <ul className="nx-bl-list">
                        <li>
                            <b>No rearma todo:</b> recomendaba pasar de 5 a 15
                            acciones. Ahora tus acciones + como mucho 2.
                        </li>
                        <li>
                            <b>Comisión repartida:</b> comparar 0,6% contra
                            retornos de 0,1% a 5 ruedas hacía que nunca
                            conviniera mover nada. Repartida en 63 ruedas, la
                            cartera conservadora de prueba rota ~37%.
                        </li>
                        <li>
                            <b>Confianza baja:</b> con modelos que aciertan
                            ~50%, creerles mucho solo amplifica ruido.
                        </li>
                        <li>
                            <b>Volatilidad de GARCH:</b> el riesgo de hoy pesa
                            más que el promedio de los últimos años.
                        </li>
                    </ul>
                    <p className="nx-muted nx-bl-code">
                        Código: api-ml/src/black_litterman/ · Endpoint: GET
                        /portfolio/recomendacion
                    </p>
                </Card>
            </div>
        </>
    );
}
