export const GLOSSARY = {
    senal: [
        'Señal',
        'Lo que el modelo se anima a decir: alza, baja o neutral. No sale de un corte fijo (tipo 55%). Cada modelo tiene su propia regla; XGBoost, por ejemplo, solo dice alza o baja en los extremos donde, medido con datos que no vio, acierta más que lo normal. En el medio se queda en neutral.',
    ],
    prob: [
        'Probabilidad de suba',
        'De XGBoost: en situaciones parecidas a la de hoy, qué tan seguido la acción terminó más arriba al final del plazo. Un 70% no es una señal de alza: es "7 de cada 10 veces subió". La señal (alza/baja/neutral) es otra cosa, y se enciende solo en los extremos. LSTM, Transformer y ARIMA no dan probabilidad: predicen un precio.',
    ],
    horizonte: [
        'Horizonte',
        'Cuántas ruedas (días hábiles) hacia adelante mira cada modelo.',
    ],
    consenso: [
        'Consenso',
        'Combina lo que dicen todos los modelos. No pesan todos igual: cuenta más el que más acertó en el pasado con esa acción, y si los modelos no coinciden entre sí, el resultado se acerca a "sin opinión".',
    ],
    confsenal: [
        'Confianza de la señal',
        'Qué tan firme es la lectura combinada. Es alta cuando los modelos coinciden entre sí y la probabilidad de XGBoost se aparta de lo normal de esa acción (en pesos, con inflación, "lo normal" suele ser más que 50%). No es un modelo aparte.',
    ],
    accuracy: [
        'Acertó en el pasado',
        'De todas las veces que el modelo dijo "sube" o "baja" con datos del pasado, en qué porcentaje acertó la dirección.',
    ],
    obs: [
        'Cantidad de pruebas',
        'Cuántas veces se puso a prueba este modelo con datos del pasado. Mientras más, más confiable es el porcentaje de acierto.',
    ],
    tasabase: [
        'Tasa base',
        'Qué tan seguido subieron las acciones en esas mismas fechas, sin que nadie elija nada. Es la vara: un modelo que dice "alza" sirve si acierta más que eso, no más que 50%.',
    ],
    tendencia: [
        'Precio estimado por la tendencia',
        'Una regresión lineal del precio (en escala logarítmica) contra el tiempo, con el último año de ruedas. El valor de esa recta hoy es el precio "que marca la tendencia". Si el precio real se aparta más de un desvío estándar, decimos que está por encima o por debajo. El R² dice cuánto del movimiento explica la recta: si es bajo, la acción se movió sin una tendencia clara y el estimado pesa poco.',
    ],
    rsi: [
        'RSI (14)',
        'Indicador de 0 a 100. Abajo de 30 = la acción cayó mucho y rápido. Arriba de 70 = subió mucho y rápido.',
    ],
    garch: [
        'Volatilidad',
        'Cuánto se espera que se mueva el precio (para arriba o para abajo) en los próximos días. Define el ancho del cono.',
    ],
    cono: [
        'Cono de proyección',
        'Rango donde probablemente quede el precio. Se abre con los días porque la incertidumbre crece.',
    ],
    ohlc: [
        'Vela japonesa',
        'Cada vela es una rueda: apertura, máximo, mínimo y cierre. Verde si cerró arriba de donde abrió; roja si cerró abajo.',
    ],
    pnl: [
        'Ganancia o pérdida',
        'Precio actual contra el precio al que compraste.',
    ],
    peso: [
        'Peso',
        'Qué porcentaje del valor total de tu cartera representa esa acción.',
    ],
    valor: [
        'Valor de la cartera',
        'Cuánto valen hoy todas tus acciones juntas, con el precio de cierre del último día hábil.',
    ],
    semana: [
        'Variación de la semana',
        'Cuánto subió o bajó el valor en los últimos 5 días hábiles.',
    ],
    sector: [
        'Sector',
        'El rubro de cada empresa: bancos, energía, servicios públicos, etc. Tener plata en varios sectores reparte el riesgo.',
    ],
    centro: [
        'Precio estimado',
        'Si se cumpliera la lectura combinada (todos los modelos juntos), acá terminaría el precio. No es un modelo solo ni una promesa: el cono de alrededor muestra el rango donde realmente puede quedar.',
    ],
    shap: [
        '¿Por qué opina esto?',
        'Desarma la predicción de XGBoost (la misma de su fila en la tabla de modelos) y muestra cuánto empujó cada dato —cómo viene la acción, cómo viene el mercado, cómo le va frente a las demás— hacia arriba o hacia abajo. Se calcula con SHAP, un método estándar para explicar modelos.',
    ],
    bl: [
        'Black-Litterman',
        'Un método matemático creado en Goldman Sachs en 1990 para repartir plata entre varias acciones. Parte de un reparto inicial (el tuyo), le suma las estimaciones de los modelos sin creerles del todo y busca el reparto con más rendimiento por cada unidad de riesgo.',
    ],
    rnormal: [
        'Rendimiento normal',
        'Lo que el mercado le "pide" a una acción solo por el riesgo que tiene, antes de escuchar a los modelos.',
    ],
    ajuste: [
        'Estimación de los modelos',
        'El rendimiento que predicen los modelos para la acción, llevado a la misma unidad que el rendimiento normal para poder compararlos.',
    ],
    rfinal: [
        'Rendimiento estimado',
        'La mezcla entre el rendimiento normal y lo que estiman los modelos. Así no se le cree ciegamente a ninguna de las dos cosas.',
    ],
    ancla: [
        'Cartera de partida',
        'El punto de partida del cálculo: tu cartera actual o todas las acciones con el mismo peso.',
    ],
    perfil: [
        'Perfil de riesgo',
        'Conservador, Moderado o Agresivo. Se elige en Ajustes. Define cuánto riesgo tolerás: con un perfil conservador, las estimaciones reparten más la plata.',
    ],
    movida: [
        'Plata que se movería',
        'Si siguieras la estimación, venderías una parte de algunas acciones y con esa misma plata comprarías otras. No hace falta poner plata nueva.',
    ],
    var: [
        'Pérdida en un día malo (VaR 95%)',
        'En 19 de cada 20 días tu pérdida no debería superar este monto. El día 20 sí puede.',
    ],
    cvar: [
        'Pérdida promedio en días muy malos',
        'Si caés en el peor día de cada 20, esta es la pérdida promedio.',
    ],
    drawdown: [
        'Caída desde el máximo',
        'Cuánto cayó la cartera desde su último máximo.',
    ],
    vol: [
        'Volatilidad anual',
        'Cuánto suele moverse la cartera en un año, para arriba o para abajo. ±30% = en un año normal puede terminar 30% arriba o 30% abajo sin que sea raro. Sale de cuánto se movió día a día en el último año.',
    ],
    beta: [
        'Beta',
        'Cuánto se mueve tu cartera cuando se mueve el mercado. 1,2 = si el mercado sube 10%, tu cartera tiende a subir 12% (y lo mismo al bajar).',
    ],
    corr: [
        'Correlación',
        'De -1 a 1. Cerca de 1 = dos acciones suben y bajan juntas (no diversifican). Cerca de 0 = se mueven independientes.',
    ],
    canasta: [
        'Canasta de líderes',
        'Un grupo de las acciones más grandes de la bolsa argentina. Sirve como referencia de cómo le fue al mercado en general.',
    ],
    compara: [
        'Comparación en pesos',
        'Toma lo que valía tu cartera al principio del período y simula qué hubiera pasado con la misma plata en un plazo fijo (a tasa BADLAR) o comprando dólar MEP. Todo se mide en pesos.',
    ],
    ccl: [
        'Dólar CCL',
        'El dólar que surge de comprar acciones o bonos en pesos y venderlos en dólares afuera. Es la referencia de las acciones argentinas que cotizan en Nueva York.',
    ],
    mep: [
        'Dólar MEP',
        'El dólar que se obtiene comprando y vendiendo bonos dentro del país.',
    ],
    riesgopais: [
        'Riesgo país',
        'Cuánto más paga Argentina por endeudarse que Estados Unidos, en puntos básicos (100 puntos = 1%). Si baja, el mercado ve menos riesgo.',
    ],
    tpm: [
        'Tasa del Banco Central',
        'La tasa de interés de referencia que fija el Banco Central.',
    ],
    badlar: [
        'Tasa BADLAR',
        'La tasa que pagan los bancos por plazos fijos grandes.',
    ],
    reservas: [
        'Reservas del Banco Central',
        'Los dólares que tiene guardados el Banco Central.',
    ],
    tnx: [
        'Bono de EE.UU. a 10 años',
        'Lo que rinde prestarle al gobierno de Estados Unidos. Si sube, el dinero tiende a irse de mercados más riesgosos como el argentino.',
    ],
    oro: ['Oro', 'Precio internacional del oro. Suele subir cuando hay miedo.'],
    wti: [
        'Petróleo',
        'Precio internacional del barril. Afecta a petroleras como YPF o Vista.',
    ],
} as const satisfies Record<string, readonly [string, string]>;

export type GlossaryKey = keyof typeof GLOSSARY;
