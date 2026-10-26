// Ficha de cada modelo y decisiones del proyecto, sacadas del codigo de
// api-ml / models y de las mediciones walk-forward (ver memoria del equipo).

export interface Ficha {
    key: string;
    nombre: string;
    tipo: 'dirección' | 'volatilidad';
    plazo: string;
    corre: string;
    algoritmo: string;
    predice: string;
    datos: string[];
    variables: Array<{ grupo: string; cuantas?: number; ejemplos: string }>;
    senal: string;
    entrenamiento: string;
    medido: string;
    estado: 'principal' | 'activo' | 'débil' | 'oculto';
}

export const FICHAS: Ficha[] = [
    {
        key: 'xgboost',
        nombre: 'XGBoost',
        tipo: 'dirección',
        plazo: '20 ruedas',
        corre: 'api-ml (+ copia en Modal)',
        algoritmo:
            'Árboles de gradiente (XGBoost, 3 semillas) promediados mitad y mitad con una regresión logística. Clasificador: aprende P(sube).',
        predice: 'Si la acción va a estar más arriba dentro de 20 ruedas.',
        datos: [
            'Velas diarias de las 20 acciones líderes (data-colector / Yahoo)',
            'Contexto del mercado armado con esas mismas acciones',
        ],
        variables: [
            {
                grupo: 'Técnicas de la acción',
                cuantas: 40,
                ejemplos:
                    'retornos de 1 a 250 ruedas, caída desde el máximo, medias de 20/50/200, volatilidad, RSI, MACD, volumen anormal',
            },
            {
                grupo: 'Contexto del mercado',
                cuantas: 10,
                ejemplos:
                    'cómo viene la canasta de líderes (5, 20, 60 ruedas), su volatilidad y caída, cuántas están arriba de su media de 50, fuerza relativa y beta',
            },
            {
                grupo: 'Distancia a la tendencia',
                cuantas: 6,
                ejemplos:
                    'a cuántos desvíos está de su recta de 6 meses y 1 año, pendiente y qué tan recta es',
            },
            {
                grupo: 'Puesto frente a las demás ese día',
                cuantas: 56,
                ejemplos:
                    'cada variable anterior convertida en percentil entre las 20 acciones',
            },
        ],
        senal: 'Cada día se ordenan las acciones por P(sube): el 20% de arriba es alza, el 20% de abajo es baja y el resto neutral.',
        entrenamiento:
            'Datos recientes pesan más (vida media 3 años). Se mide fuera de muestra con el último 25% de las fechas en 4 reentrenos sucesivos. Se reentrena el día 2 de cada mes (GitHub Actions) y solo se guarda si el AUC fuera de muestra llega a 0,52.',
        medido: 'Walk-forward 2016–2026: AUC por mes 0,588. Alza acierta 61% (lo normal 58%), baja 45% (lo normal 42%). Su ventaja es detectar momentos del mercado, no elegir acciones.',
        estado: 'principal',
    },
    {
        key: 'xgboost-5',
        nombre: 'XGBoost 5 ruedas',
        tipo: 'dirección',
        plazo: '5 ruedas',
        corre: 'api-ml',
        algoritmo: 'El mismo XGBoost de panel, entrenado para 5 ruedas.',
        predice: 'Si la acción va a estar más arriba dentro de 5 ruedas.',
        datos: ['Igual que XGBoost'],
        variables: [
            {
                grupo: 'Las mismas 112 de XGBoost',
                ejemplos:
                    'técnicas, contexto, tendencia y puesto frente a las demás',
            },
        ],
        senal: 'Ranking del día: 20% de arriba alza, 20% de abajo baja.',
        entrenamiento:
            'Junto con XGBoost, el día 2 de cada mes (piso de AUC 0,50).',
        medido: 'Walk-forward 2016–2026: AUC por mes 0,546 (IC 0,526–0,565). Al entrenar: alza 62,9% (lo normal 54,9%), baja 50,3% (lo normal 45,1%). Reemplaza a los modelos de 5 ruedas que miran solo el precio.',
        estado: 'principal',
    },
    {
        key: 'contexto',
        nombre: 'Contexto',
        tipo: 'dirección',
        plazo: '20 ruedas',
        corre: 'api-ml',
        algoritmo:
            'HistGradientBoosting de scikit-learn (6 modelos promediados). Misma familia que XGBoost, otra librería.',
        predice: 'P(baja) a 20 ruedas; se muestra como P(sube) = 1 − P(baja).',
        datos: ['Igual que XGBoost'],
        variables: [
            {
                grupo: 'Las mismas 112 de XGBoost',
                ejemplos:
                    'desde el 26-oct usa exactamente las variables de XGBoost (antes usaba solo las técnicas y el contexto)',
            },
        ],
        senal: 'Ranking del día: el 20% con más P(baja) es baja, el 20% con menos es alza.',
        entrenamiento:
            'El día 1 de cada mes (GitHub Actions), piso de AUC 0,52.',
        medido: 'Walk-forward: AUC por mes 0,589, casi igual que XGBoost (+0,007, no es una diferencia segura). Combinarlos no suma.',
        estado: 'activo',
    },
    {
        key: 'lstm',
        nombre: 'LSTM',
        tipo: 'dirección',
        plazo: '5 ruedas',
        corre: 'api-ml (+ copia en Modal)',
        algoritmo:
            'Red recurrente LSTM (32 neuronas) que mira una ventana de 30 días. Regresión: predice el retorno.',
        predice: 'Retorno logarítmico a 5 ruedas → precio esperado.',
        datos: ['Velas de cada acción', 'Una tasa macro (cambio de 5 días)'],
        variables: [
            {
                grupo: 'Serie de la propia acción',
                cuantas: 8,
                ejemplos:
                    'retorno, cambio de volumen, rango del día, RSI, distancia a la media de 20, MACD, momentum de 10 y cambio de la tasa',
            },
        ],
        senal: 'Alza si espera más de +1%, baja si espera menos de −1%; si no, neutral.',
        entrenamiento:
            'Lunes a viernes 20:00 (GitHub Actions), solo se guarda si mejora al vigente.',
        medido: 'En vivo acierta la dirección el 47,9% (1.977 casos): peor que tirar una moneda.',
        estado: 'débil',
    },
    {
        key: 'transformer',
        nombre: 'Transformer',
        tipo: 'dirección',
        plazo: '5 ruedas',
        corre: 'api-ml (+ copia en Modal)',
        algoritmo:
            'Transformer de panel: atención sobre los días de cada acción y entre las acciones del mismo día. Se promedian varias semillas.',
        predice:
            'Si la acción le va a ganar al resto del panel en 5 ruedas, en dólares CCL.',
        datos: [
            'Velas del data-colector convertidas a dólares CCL',
            'Series macro (CCL, brecha, riesgo país, BADLAR, reservas)',
        ],
        variables: [
            {
                grupo: 'De la acción',
                ejemplos:
                    'retornos de 1 a 60 ruedas, reversión frente al panel y al sector, volatilidades, volumen anormal, distancias a medias, caídas y beta',
            },
            {
                grupo: 'Del mercado',
                ejemplos: 'un "token" con el contexto macro del día',
            },
        ],
        senal: 'Signo del retorno predicho.',
        entrenamiento:
            'El día 1 de cada mes (GitHub Actions). El original (Transformer v1) queda para las acciones fuera del panel.',
        medido: 'En vivo acierta la dirección el 51,6%.',
        estado: 'débil',
    },
    {
        key: 'arima',
        nombre: 'ARIMA',
        tipo: 'dirección',
        plazo: '5 ruedas',
        corre: 'api-ml (+ copia en Modal)',
        algoritmo:
            'ARIMA(1,1,1) estadístico, ajustado al momento para cada acción.',
        predice: 'El precio de los próximos días proyectando la serie.',
        datos: ['Solo los cierres de la acción'],
        variables: [
            {
                grupo: 'Serie de cierres',
                ejemplos: 'no usa variables: modela la propia serie',
            },
        ],
        senal: 'Franja neutral alrededor de cero.',
        entrenamiento: 'No se entrena de antemano: se ajusta en cada pedido.',
        medido: 'En vivo acierta la dirección el 51,5%. Casi siempre dice neutral (96%).',
        estado: 'débil',
    },
    {
        key: 'macro',
        nombre: 'Macro',
        tipo: 'dirección',
        plazo: '20 ruedas',
        corre: 'api-ml',
        algoritmo:
            'Árboles (HistGradientBoosting / ExtraTrees) con variables macro.',
        predice: 'Alza o baja a 20 ruedas.',
        datos: [
            'Velas de cada acción',
            'Dólares y riesgo país (ArgentinaDatos)',
            'BADLAR, reservas, base monetaria (BCRA)',
        ],
        variables: [
            {
                grupo: 'Técnicas',
                cuantas: 40,
                ejemplos: 'las mismas técnicas de XGBoost',
            },
            {
                grupo: 'Macro',
                cuantas: 20,
                ejemplos:
                    'CCL a 1/5/20/60 días, brecha, MEP vs CCL, blue, riesgo país y su cambio, reservas, BADLAR, tasa real',
            },
            {
                grupo: 'Eventos',
                cuantas: 5,
                ejemplos: 'días a la elección, fin de mes, aguinaldo',
            },
        ],
        senal: 'Extremos calibrados al entrenar.',
        entrenamiento: 'El día 1 de cada mes (GitHub Actions).',
        medido: 'Frágil: depende de series que fallan seguido. Sumar macro no mejoró en ninguna prueba.',
        estado: 'oculto',
    },
    {
        key: 'garch',
        nombre: 'GARCH',
        tipo: 'volatilidad',
        plazo: '1 a 60 ruedas',
        corre: 'api-ml (+ GARCH y GARCH-ANN en Modal)',
        algoritmo:
            'GARCH(1,1) sobre retornos logarítmicos diarios, ajustado al momento.',
        predice:
            'Cuánto se puede mover el precio (para cualquier lado), no la dirección.',
        datos: ['Solo los cierres de la acción'],
        variables: [
            {
                grupo: 'Retornos diarios',
                ejemplos:
                    'la volatilidad de hoy depende de la de ayer y del último movimiento',
            },
        ],
        senal: 'No da señal: arma el cono de "rango probable" y la volatilidad que usa Black-Litterman.',
        entrenamiento: 'Se ajusta en cada pedido.',
        medido: 'La volatilidad sí es predecible (a diferencia de la dirección).',
        estado: 'activo',
    },
    {
        key: 'svm-modal',
        nombre: 'SVM',
        tipo: 'dirección',
        plazo: 'corto plazo',
        corre: 'Modal',
        algoritmo: 'Máquina de vectores de soporte (kernel RBF).',
        predice: 'Dirección binaria (sube o baja) con una confianza.',
        datos: ['Velas de cada acción'],
        variables: [
            { grupo: 'Serie de la acción', ejemplos: 'indicadores técnicos' },
        ],
        senal: 'alza o baja; nunca neutral.',
        entrenamiento: 'En Modal, por ticker.',
        medido: 'Sin medición propia en el paper trading.',
        estado: 'activo',
    },
];

export interface Decision {
    fecha: string;
    titulo: string;
    problema: string;
    probamos: string;
    decision: string;
    evidencia: string;
    tag: 'modelos' | 'señal' | 'cartera' | 'datos' | 'producto';
}

export const DECISIONES: Decision[] = [
    {
        fecha: '2026-10-15',
        titulo: 'Sumar el contexto del mercado',
        tag: 'modelos',
        problema:
            'Los modelos que miran una sola acción adivinan la dirección casi al azar.',
        probamos:
            'Variables técnicas, macro, fuerza relativa, amplitud del mercado.',
        decision:
            'Que los clasificadores miren cómo viene la canasta de líderes y cómo viene la acción frente a ella.',
        evidencia:
            'AUC de 0,51 a 0,55. Lo único que mejoró de forma consistente.',
    },
    {
        fecha: '2026-10-19',
        titulo: 'XGBoost v2: comparar cada acción con las demás',
        tag: 'modelos',
        problema: 'Predecir 5 ruedas por acción no superaba "siempre sube".',
        probamos:
            'Clasificador a 20 ruedas con percentiles entre las acciones del día y mezcla con una logística.',
        decision: 'XGBoost pasa a ser un modelo de panel a 20 ruedas.',
        evidencia:
            'El 10% de casos con más chances sube 15 puntos más que lo normal.',
    },
    {
        fecha: '2026-10-20',
        titulo: 'Más datos no es mejor',
        tag: 'datos',
        problema: '¿Más acciones o más fuentes mejoran la predicción?',
        probamos: 'ADR en Nueva York, CCL, panel ampliado, otras etiquetas.',
        decision: 'Quedarse con el panel líder y sin esas fuentes.',
        evidencia:
            'Ninguna mejoró; solo los rangos en Contexto (+0,016 AUC por mes).',
    },
    {
        fecha: '2026-10-24',
        titulo: 'Black-Litterman no rearma toda la cartera',
        tag: 'cartera',
        problema:
            'Recomendaba pasar de 5 a 15 acciones: caro e innecesario con modelos débiles.',
        probamos: 'Universo acotado y costo de operar en el objetivo.',
        decision:
            'Tus acciones + como mucho 2 nuevas (y solo si les toca 3% o más), con 0,6% de comisión por punta.',
        evidencia:
            'Con la cartera de prueba pasó de 10 acciones y 28% de rotación a quedarse como estaba.',
    },
    {
        fecha: '2026-10-24',
        titulo: 'Precio estimado por regresión lineal',
        tag: 'producto',
        problema:
            'Los profesores pidieron un "precio estimado" como TradingView o Seeking Alpha.',
        probamos:
            'Recta del log del precio contra el tiempo (1 año) y qué pasó otras veces a esa distancia.',
        decision: 'Mostrarlo como evidencia histórica, no como predicción.',
        evidencia:
            'Debajo de −2 desvíos subió el 72,5% de las veces en 20 ruedas, contra 62% en general.',
    },
    {
        fecha: '2026-10-26',
        titulo: 'La distancia a la tendencia como variable',
        tag: 'modelos',
        problema:
            'La regresión mostraba algo de señal: ¿le sirve a los modelos?',
        probamos:
            'Sumar distancia, pendiente y qué tan recta es la tendencia (6 meses y 1 año) a XGBoost y Contexto.',
        decision: 'Integrarlas.',
        evidencia: 'AUC por mes de 0,580 a 0,588 (IC +0,001 a +0,014).',
    },
    {
        fecha: '2026-10-26',
        titulo: 'Comisión repartida en el tiempo',
        tag: 'cartera',
        problema:
            'Black-Litterman nunca cambiaba nada: comparaba 0,6% de comisión contra retornos a 5 ruedas.',
        probamos: 'Repartir la comisión en 1, 3, 6 y 12 meses de tenencia.',
        decision: 'Repartirla en 3 meses (63 ruedas).',
        evidencia:
            '2017–2026: conservador +8,6%/año (40 de 40 carteras), moderado +2,0% (38 de 40), agresivo −7,4% (concentra en 2-3 acciones).',
    },
    {
        fecha: '2026-10-26',
        titulo: 'Señal por ranking del día',
        tag: 'señal',
        problema:
            'Con umbral fijo había años en que el modelo opinaba el 2% de las veces y otros el 98%.',
        probamos:
            'Umbral fijo, umbral móvil de un año y ranking del día (15, 20 y 30%).',
        decision: 'Cada día, 20% de arriba alza y 20% de abajo baja.',
        evidencia:
            'Opina 37–44% todos los años. Alza 59,7% vs 56,7% normal; baja 47,2% vs 43,3%.',
    },
    {
        fecha: '2026-10-26',
        titulo: 'XGBoost 5 ruedas en lugar de LSTM',
        tag: 'modelos',
        problema:
            'Los modelos de 5 ruedas (LSTM, Transformer, ARIMA) miran solo el precio y dan azar.',
        probamos: 'El enfoque de panel de XGBoost a 5 ruedas.',
        decision: 'Sumar "XGBoost 5 ruedas".',
        evidencia: 'AUC por mes 0,546 vs LSTM en vivo 47,9% de acierto.',
    },
    {
        fecha: '2026-10-26',
        titulo: 'Probado y descartado',
        tag: 'modelos',
        problema: 'Ideas para predecir mejor.',
        probamos:
            '% "directo de los datos" con las 400 situaciones más parecidas; XGBoost + Contexto promediados; objetivos estilo Danelfin/Zacks (ganarle al panel); probabilidad calibrada.',
        decision: 'No usarlas.',
        evidencia:
            'Vecinos: AUC 0,530 (peor). Combinados: +0,006 (no seguro). Objetivos relativos: AUC 0,51. Calibrada: no le gana a la tasa normal.',
    },
    {
        fecha: '2026-10-26',
        titulo: 'Un solo modelo en la pantalla',
        tag: 'producto',
        problema:
            'El gráfico mostraba 7 predicciones y la lectura combinada: no se entendía.',
        probamos: '—',
        decision:
            'Cartel y gráfico muestran el modelo elegido en Ajustes o, si no, el que mejor acertó con esa acción. El resto, abajo.',
        evidencia:
            'Pedido del usuario; la lectura combinada sigue en el detalle.',
    },
    {
        fecha: '2026-10-26',
        titulo: 'Ocultar Macro',
        tag: 'producto',
        problema: 'Depende de series que fallan y no mejora nada.',
        probamos: '—',
        decision:
            'El admin puede ocultar cualquier modelo; Macro arranca oculto.',
        evidencia: 'Ver "Más datos no es mejor".',
    },
    {
        fecha: 'jul-2026',
        titulo: 'Paper trading diario',
        tag: 'datos',
        problema:
            'Las métricas de entrenamiento no alcanzan para saber si un modelo sirve.',
        probamos: '—',
        decision:
            'Guardar todos los días lo que dice cada modelo y compararlo con lo que pasó (cron 21:00).',
        evidencia:
            'Es la fuente del Historial de señales y de "Lo que predijo vs lo que pasó".',
    },
    {
        fecha: '2026-10-22',
        titulo: 'Foto diaria del comparador',
        tag: 'datos',
        problema:
            'Comparar todos los modelos en vivo tardaba más que el timeout.',
        probamos: '—',
        decision:
            'El cron de las 21:00 guarda la comparación de cada acción; api-ml la sirve hasta la próxima corrida (+3 h) y si no, calcula en vivo.',
        evidencia: 'Acción carga en segundos en vez de minutos.',
    },
];
