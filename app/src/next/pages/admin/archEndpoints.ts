// Endpoints reales de cada caja del diagrama de Arquitectura, sacados del
// codigo y del OpenAPI de cada servicio (rutas de axum / FastAPI / Modal y
// URLs externas que se consultan). Las bases muestran tablas y SMTP los mails.

/** [nombre, tipo, que es]. */
export type Field = [string, string, string];

export interface ArchItem {
    /** GET / POST / ... ; TABLA, MAIL, PÁG y CRON para lo que no es HTTP. */
    m: string;
    path: string;
    d: string;
    /** Quien lo llama (solo cuando no es obvio). */
    by?: string;
    /** Que recibe: parametros de la ruta, de la query o del body. */
    req?: Field[];
    /** Que devuelve. */
    res?: Field[];
    /** Para que se usa en FinanciAr. */
    uso?: string;
    /** Si pide token (o rol admin). */
    auth?: string;
}

export interface ArchGroup {
    title: string;
    items: ArchItem[];
}

const TOKEN = 'Token de sesión (Authorization: Bearer …)';
const ADMIN = 'Token de un usuario con rol admin';

// Campos que se repiten en varias respuestas de api-ml.
const PRED: Field[] = [
    ['signal', 'texto', 'alza, baja o neutral.'],
    ['horizon_days', 'entero', 'A cuántas ruedas predice (5 o 20).'],
    ['last_close', 'número', 'Último cierre que usó el modelo.'],
    ['predicted_close', 'número', 'Precio que espera al final del plazo.'],
    ['rsi', 'número', 'RSI de 14 ruedas (0-100).'],
    ['condition', 'texto', 'sobrecompra, sobreventa o neutral según el RSI.'],
    ['as_of', 'fecha', 'Rueda sobre la que predijo.'],
    ['model · model_version', 'texto', 'Qué modelo y qué entrenamiento.'],
];

const SERIE_RES: Field[] = [
    ['series', 'texto', 'Identificador normalizado (ej: CCL, BADLAR, TNX).'],
    ['source', 'texto', 'De dónde salió: ARGDATOS, AR (BCRA) o US (Yahoo).'],
    ['cached', 'bool', 'true si salió de la base sin volver a la fuente.'],
    ['data[].ts', 'entero', 'Fecha en milisegundos.'],
    ['data[].value', 'texto', 'Valor de la serie ese día.'],
];

export const ARCH_ENDPOINTS: Record<string, ArchGroup[]> = {
    src1: [
        {
            title: 'BYMA (open.bymadata.com.ar) · lo llama data-colector',
            items: [
                {
                    m: 'POST',
                    path: '/vanoms-be-core/rest/api/bymadata/free/leading-equity',
                    d: 'Panel líder: tickers y puntas del día.',
                    req: [
                        [
                            'body',
                            'json',
                            'Filtros de la consulta (los mismos que manda la web pública de BYMA).',
                        ],
                    ],
                    res: [
                        ['symbol', 'texto', 'Ticker (ej: GGAL).'],
                        [
                            'offerPrice',
                            'número',
                            'Mejor precio de venta del momento.',
                        ],
                        [
                            'bidPrice',
                            'número',
                            'Mejor precio de compra del momento.',
                        ],
                    ],
                    uso: 'Arma la lista de acciones del panel líder y guarda las puntas del día (bid_offer_historical_prices). El panel general y los CEDEARs están en el código pero desactivados.',
                },
            ],
        },
        {
            title: 'Rava (mercado.rava.com) · lo llama data-colector',
            items: [
                {
                    m: 'GET',
                    path: '/api/prices/clasificacion',
                    d: 'Clasificación de cada ticker.',
                    res: [
                        [
                            '[]',
                            'lista',
                            'Ticker con su sector y tipo de activo.',
                        ],
                    ],
                    uso: 'Llena la tabla ticker_sector, que muestra el sector en la ficha de cada acción. Cada 10 horas.',
                },
                {
                    m: 'GET',
                    path: '/api/prices/refdata',
                    d: 'Datos de referencia de cada ticker.',
                    res: [
                        [
                            '[]',
                            'lista',
                            'Ticker, nombre corto, nombre largo y descripción.',
                        ],
                    ],
                    uso: 'El nombre de la empresa que aparece debajo del ticker (ej: "Grupo Financiero Galicia").',
                },
                {
                    m: 'GET',
                    path: '/api/prices/historico/arg/{ticker}?dias=4435',
                    d: 'Histórico de precios de respaldo.',
                    req: [
                        ['ticker', 'ruta', 'Ticker de BYMA.'],
                        [
                            'dias',
                            'query',
                            'Cuántos días para atrás (4.435, unos 12 años).',
                        ],
                    ],
                    res: [
                        [
                            '[]',
                            'lista',
                            'Fecha, apertura, máximo, mínimo, cierre y volumen.',
                        ],
                    ],
                    uso: 'Respaldo cuando Yahoo no tiene la serie de una acción.',
                },
            ],
        },
    ],
    src2: [
        {
            title: 'Yahoo Finance (query1.finance.yahoo.com)',
            items: [
                {
                    m: 'GET',
                    path: '/v8/finance/chart/{ticker}.BA',
                    d: 'Velas diarias de una acción argentina.',
                    by: 'data-colector y api-ml (DATA_SOURCE=yahoo)',
                    req: [
                        [
                            'ticker',
                            'ruta',
                            'Ticker con sufijo .BA (ej: GGAL.BA).',
                        ],
                        [
                            'range · interval',
                            'query',
                            '10y y 1d: diez años de velas diarias.',
                        ],
                    ],
                    res: [
                        [
                            'timestamp[]',
                            'entero',
                            'Fecha de cada rueda (segundos).',
                        ],
                        [
                            'indicators.quote',
                            'listas',
                            'open, high, low, close y volume de cada rueda.',
                        ],
                        [
                            'adjclose',
                            'lista',
                            'Cierre ajustado por dividendos y splits.',
                        ],
                    ],
                    uso: 'Es la historia larga de precios con la que se entrenan todos los modelos.',
                },
                {
                    m: 'GET',
                    path: '/v8/finance/chart/^IRX · ^FVX · ^TNX · ^TYX',
                    d: 'Tasas del Tesoro de EE.UU.',
                    by: 'data-colector',
                    res: [
                        [
                            'close',
                            'número',
                            'Rendimiento anual en % del bono a 3 meses, 5, 10 y 30 años.',
                        ],
                    ],
                    uso: 'Variable macro (tasa libre de riesgo de EE.UU.) para el modelo Macro y la pantalla Mercado.',
                },
                {
                    m: 'GET',
                    path: '/v8/finance/chart/GC=F · CL=F',
                    d: 'Oro y petróleo.',
                    by: 'data-colector (se guardan como GOLD y OIL)',
                    uso: 'Se pueden cargar en la cartera como un activo más; se refrescan cada 6 horas.',
                },
            ],
        },
    ],
    src3: [
        {
            title: 'ArgentinaDatos (api.argentinadatos.com/v1) · lo llama data-colector',
            items: [
                {
                    m: 'GET',
                    path: '/cotizaciones/dolares/{casa}',
                    d: 'Cotización histórica de un dólar.',
                    req: [
                        [
                            'casa',
                            'ruta',
                            'contadoconliqui, bolsa (MEP), blue, oficial o mayorista.',
                        ],
                    ],
                    res: [
                        ['fecha', 'fecha', 'Día de la cotización.'],
                        [
                            'compra · venta',
                            'número',
                            'Precio de compra y de venta.',
                        ],
                    ],
                    uso: 'El CCL convierte los precios a dólares en Acción ("US$ CCL") y es variable del modelo Macro.',
                },
                {
                    m: 'GET',
                    path: '/finanzas/indices/riesgo-pais',
                    d: 'Riesgo país histórico.',
                    res: [
                        ['fecha', 'fecha', 'Día.'],
                        ['valor', 'número', 'Puntos básicos.'],
                    ],
                    uso: 'Pantalla Mercado y modelo Macro.',
                },
            ],
        },
    ],
    src4: [
        {
            title: 'BCRA (api.bcra.gob.ar) · lo llama data-colector',
            items: [
                {
                    m: 'GET',
                    path: '/estadisticas/v4.0/Monetarias/{variable}',
                    d: 'Una variable monetaria del BCRA.',
                    req: [
                        [
                            'variable',
                            'ruta',
                            'Número de variable del BCRA (BADLAR, TPM, reservas, etc.).',
                        ],
                        ['desde · hasta', 'query', 'Rango de fechas.'],
                    ],
                    res: [
                        ['fecha', 'fecha', 'Día.'],
                        [
                            'valor',
                            'número',
                            'Valor (tasa en % anual, reservas en millones de US$…).',
                        ],
                    ],
                    uso: 'La BADLAR es la tasa libre de riesgo de Black-Litterman y la referencia de "plazo fijo" en el Resumen.',
                },
            ],
        },
        {
            title: 'Tasas de EE.UU. (vía Yahoo, no el Tesoro directo)',
            items: [
                {
                    m: 'GET',
                    path: '/v8/finance/chart/^IRX · ^FVX · ^TNX · ^TYX',
                    d: 'Rendimiento de los bonos del Tesoro.',
                    uso: 'Ver la caja de Yahoo Finance.',
                },
            ],
        },
    ],
    dc: [
        {
            title: 'Datos de mercado',
            items: [
                {
                    m: 'POST',
                    path: '/available-tickers',
                    d: 'Lista de tickers que tiene guardados.',
                    res: [
                        ['status', 'entero', 'Código HTTP lógico.'],
                        [
                            'message.tickers',
                            'lista',
                            'Tickers disponibles (BYMA + Rava).',
                        ],
                    ],
                    uso: 'El buscador de acciones y el catálogo /shares del backend.',
                },
                {
                    m: 'POST',
                    path: '/model-ready-tickers',
                    d: 'Tickers con historia suficiente para predecir.',
                    res: [
                        [
                            'message.tickers',
                            'lista',
                            'Los que tienen al menos 100 ruedas guardadas (hoy 22).',
                        ],
                    ],
                    uso: 'El backend lo consulta al cargar una acción: si no está acá, responde 422 ("no tiene suficiente histórico").',
                },
                {
                    m: 'POST',
                    path: '/historical-data/{ticker}',
                    d: 'Velas diarias de un ticker.',
                    req: [
                        [
                            'ticker',
                            'ruta',
                            'Ticker limpio (GGAL, YPFD, GOLD, OIL).',
                        ],
                    ],
                    res: [
                        ['cached', 'bool', 'true si salió de la base.'],
                        ['data[].ts', 'entero', 'Fecha en milisegundos.'],
                        [
                            'data[].open_amount · high_amount · low_amount · close_amount',
                            'texto',
                            'Precios de la rueda (como texto para no perder decimales).',
                        ],
                        [
                            'data[].close_unadj_amount',
                            'texto',
                            'Cierre sin ajustar.',
                        ],
                        ['data[].volume', 'entero', 'Volumen.'],
                    ],
                    uso: 'De acá salen todos los precios: gráficos, P&L, entrenamiento de api-ml y Modal.',
                },
                {
                    m: 'GET',
                    path: '/historical-data/{ticker}/movement',
                    d: 'Cómo se movió el precio entre dos fechas.',
                    req: [
                        ['ticker', 'ruta', 'Ticker.'],
                        [
                            'from',
                            'query',
                            'Fecha base (YYYY-MM-DD): el "as_of" de una predicción.',
                        ],
                        [
                            'days',
                            'query',
                            'Cuántas ruedas hábiles hacia adelante.',
                        ],
                    ],
                    res: [
                        [
                            'base_date',
                            'fecha',
                            'Rueda base que usó (si from no era hábil, la anterior).',
                        ],
                        [
                            'target_date',
                            'fecha',
                            'Rueda que cae days ruedas después.',
                        ],
                        [
                            'series[]',
                            'lista',
                            'Precio día por día entre las dos fechas (open, high, low, close, volume).',
                        ],
                    ],
                    uso: 'Corroborar una predicción: qué pasó realmente en el plazo que predijo el modelo.',
                },
                {
                    m: 'GET',
                    path: '/ticker/sector/{ticker}',
                    d: 'Sector de la empresa.',
                    req: [['ticker', 'ruta', 'Ticker.']],
                    res: [
                        [
                            'sector',
                            'texto o null',
                            'Ej: Financial Services. null si no se conoce.',
                        ],
                    ],
                    uso: 'Etiqueta de sector en Acción y Cartera.',
                },
            ],
        },
        {
            title: 'Macro y tasas',
            items: [
                {
                    m: 'POST',
                    path: '/macro/argdatos/{serie}',
                    d: 'Dólares y riesgo país.',
                    req: [
                        [
                            'serie',
                            'ruta',
                            'CCL, MEP, OFICIAL, MAYORISTA, BLUE o RIESGO_PAIS.',
                        ],
                    ],
                    res: SERIE_RES,
                    uso: 'Modelo Macro, conversión a dólares y pantalla Mercado. Vuelve a ArgentinaDatos solo si pasaron más de 2 días desde el último pedido, y si no hay datos nuevos no reescribe nada.',
                },
                {
                    m: 'POST',
                    path: '/interest-rate/ar/{serie}',
                    d: 'Tasas y variables del BCRA.',
                    req: [
                        [
                            'serie',
                            'ruta',
                            'TPM, BADLAR o el número de variable del BCRA.',
                        ],
                    ],
                    res: SERIE_RES,
                    uso: 'Tasa libre de riesgo de Black-Litterman y referencia de plazo fijo. Se vuelve a pedir al BCRA cada 5 días.',
                },
                {
                    m: 'POST',
                    path: '/interest-rate/us/{serie}',
                    d: 'Tasas del Tesoro de EE.UU.',
                    req: [
                        ['serie', 'ruta', 'IRX, FVX, TNX o TYX (con o sin ^).'],
                    ],
                    res: SERIE_RES,
                    uso: 'Modelo Macro y pantalla Mercado.',
                },
            ],
        },
        {
            title: 'Servicio',
            items: [
                {
                    m: 'GET',
                    path: '/health',
                    d: 'Si está vivo y conectado a la base.',
                    res: [
                        ['status', 'entero', '200 si anda.'],
                        ['message', 'texto', 'Descripción del estado.'],
                    ],
                    uso: 'Lo consulta /admin/health del backend para el semáforo de Servicios.',
                },
                {
                    m: 'GET',
                    path: '/swagger',
                    d: 'Documentación interactiva de la API.',
                },
            ],
        },
    ],
    db: [
        {
            title: 'Tablas',
            items: [
                {
                    m: 'TABLA',
                    path: 'ticker_history_data_cached_yf',
                    d: 'Velas diarias de Yahoo de cada ticker: fecha, apertura, máximo, mínimo, cierre y volumen.',
                },
                {
                    m: 'TABLA',
                    path: 'bid_offer_historical_prices',
                    d: 'Precios del día de BYMA.',
                },
                {
                    m: 'TABLA',
                    path: 'available_tickers_byma',
                    d: 'Lista de acciones de BYMA.',
                },
                {
                    m: 'TABLA',
                    path: 'rava_tickers · rava_ticker_history',
                    d: 'Tickers con nombre y descripción, e histórico de Rava.',
                },
                {
                    m: 'TABLA',
                    path: 'ticker_sector',
                    d: 'Sector de cada empresa.',
                },
                {
                    m: 'TABLA',
                    path: 'interest_rate_cached',
                    d: 'Tasas y series macro: serie, fuente, fecha y valor.',
                },
                {
                    m: 'TABLA',
                    path: 'interest_rate_fetches',
                    d: 'Cuándo se pidió cada serie por última vez (para no volver a la fuente si no hay datos nuevos).',
                },
            ],
        },
    ],
    ml: [
        {
            title: 'Predicciones',
            items: [
                {
                    m: 'GET',
                    path: '/predict/trend/compare/{symbol}',
                    d: 'Todos los modelos sobre una acción.',
                    req: [['symbol', 'ruta', 'Ticker (ej: GGAL).']],
                    res: [
                        [
                            'predictions',
                            'objeto',
                            'Una entrada por modelo (lstm, xgboost, xgboost-5, contexto, transformer, arima…).',
                        ],
                        ...PRED,
                        [
                            'probability_up',
                            'número',
                            'Solo XGBoost y Contexto: P(sube) que da el modelo (0-1).',
                        ],
                        [
                            'probability_up_calibrated',
                            'número o null',
                            'Esa probabilidad llevada a lo que pasó de verdad en el pasado.',
                        ],
                        [
                            'base_up_rate',
                            'número',
                            'Qué tan seguido sube una acción en ese plazo (lo normal).',
                        ],
                        [
                            'backtest',
                            'objeto',
                            'Acierto de dirección medido y sobre cuántos casos.',
                        ],
                        ['default_model', 'texto', 'Modelo por defecto.'],
                        [
                            'source',
                            'texto',
                            'snapshot (foto diaria de las 21 h) o live (calculado ahora).',
                        ],
                    ],
                    uso: 'La pantalla Acción entera: cartel, gráfico de proyección, "Qué predijo cada modelo".',
                },
                {
                    m: 'GET',
                    path: '/predict/trend/{symbol}',
                    d: 'Predicción de un solo modelo.',
                    req: [
                        ['symbol', 'ruta', 'Ticker.'],
                        [
                            'model',
                            'query (opcional)',
                            'lstm, xgboost, xgboost-5, transformer, arima, contexto… (default lstm).',
                        ],
                    ],
                    res: PRED,
                    uso: 'La señal de cada acción de la cartera (/user/shares/trends del backend).',
                },
                {
                    m: 'POST',
                    path: '/predict/trend',
                    d: 'Lo mismo, con los datos en el body.',
                    req: [
                        ['symbol', 'body', 'Ticker.'],
                        ['model', 'body', 'Modelo.'],
                    ],
                    res: PRED,
                },
                {
                    m: 'GET',
                    path: '/predict/trend/consensus/{symbol}',
                    d: 'Lectura combinada de todos los modelos.',
                    req: [
                        ['symbol', 'ruta', 'Ticker.'],
                        [
                            'profile',
                            'query (opcional)',
                            'conservative, moderate o aggressive.',
                        ],
                    ],
                    res: [
                        [
                            'classification',
                            'texto',
                            'sobrecompra, sobreventa o neutral.',
                        ],
                        [
                            'composite_score',
                            'número',
                            'Retorno esperado combinado (log).',
                        ],
                        [
                            'threshold_buy · threshold_sell',
                            'número',
                            'Desde dónde es alza o baja para ese perfil.',
                        ],
                        [
                            'aggregate_confidence',
                            'número',
                            'Confianza combinada (0-1).',
                        ],
                        [
                            'components[]',
                            'lista',
                            'Cada modelo: retorno esperado, calidad (peso), acuerdo y señal.',
                        ],
                        [
                            'track_record',
                            'objeto',
                            'Cuántas veces acertó esta lectura en el paper trading.',
                        ],
                        ['explanation', 'texto', 'Explicación en castellano.'],
                    ],
                    uso: 'El bloque "De dónde sale cada número" y la tira de modelos en Acción.',
                },
                {
                    m: 'GET',
                    path: '/predict/ranking',
                    d: 'Ranking del día de las acciones del panel.',
                    res: [
                        [
                            'model_version · horizon_days',
                            'texto · entero',
                            'Qué XGBoost y a cuántas ruedas.',
                        ],
                        ['acciones[].symbol', 'texto', 'Ticker.'],
                        [
                            'acciones[].probability_up',
                            'número',
                            'P(sube) que da XGBoost.',
                        ],
                        [
                            'acciones[].signal',
                            'texto',
                            'alza (20% de arriba), baja (20% de abajo) o neutral.',
                        ],
                        [
                            'acciones[].puesto · puntaje',
                            'entero',
                            'Posición en el ranking y puntaje de 1 a 10.',
                        ],
                    ],
                    uso: 'La pantalla "Ranking del día".',
                },
                {
                    m: 'GET',
                    path: '/predict/trend/xgboost/explain/{symbol}',
                    d: 'Por qué XGBoost dice lo que dice.',
                    req: [['symbol', 'ruta', 'Ticker.']],
                    res: [
                        ['probability_up', 'número', 'P(sube) de XGBoost.'],
                        [
                            'base_value',
                            'número',
                            'Punto de partida antes de mirar las variables (log-odds).',
                        ],
                        [
                            'contributions[]',
                            'lista',
                            'Cada variable: nombre, valor de hoy y cuánto empujó para arriba o para abajo (SHAP).',
                        ],
                        [
                            'alza_threshold · baja_threshold',
                            'número',
                            'Umbrales de la señal.',
                        ],
                        ['base_up_rate', 'número', 'Lo normal.'],
                    ],
                    uso: 'El bloque "Por qué" al final de Acción.',
                },
                {
                    m: 'GET',
                    path: '/predict/fair-value/{symbol}',
                    d: 'Precio estimado por regresión lineal.',
                    req: [
                        ['symbol', 'ruta', 'Ticker.'],
                        [
                            'ventana',
                            'query (opcional)',
                            'Ruedas de la recta (default 252, un año).',
                        ],
                    ],
                    res: [
                        [
                            'precio_actual · precio_estimado',
                            'número',
                            'Precio de hoy y el que marca la recta de tendencia.',
                        ],
                        [
                            'diferencia',
                            'número',
                            'Cuánto está arriba o abajo de la recta (fracción).',
                        ],
                        [
                            'desvios · posicion',
                            'número · texto',
                            'A cuántos desvíos está y si eso es por_encima, en_linea o por_debajo.',
                        ],
                        [
                            'tendencia_anual · r2',
                            'número',
                            'Pendiente anualizada y qué tan recta es la tendencia (0-1).',
                        ],
                        [
                            'historico · evidencia.tramos[]',
                            'objeto',
                            'Otras veces que estuvo a esa distancia: cuántas subió en 20 ruedas y sobre cuántos casos.',
                        ],
                        [
                            'canal[]',
                            'lista',
                            'Recta y bandas de ±1 y ±2 desvíos día por día.',
                        ],
                    ],
                    uso: 'El bloque "Precio estimado" y el canal de tendencia del gráfico de Acción.',
                },
                {
                    m: 'GET',
                    path: '/predict/volatility/{symbol}',
                    d: 'Cuánto se puede mover el precio (GARCH local).',
                    req: [
                        ['symbol', 'ruta', 'Ticker.'],
                        [
                            'horizon',
                            'query (opcional)',
                            'Ruedas a pronosticar.',
                        ],
                    ],
                    res: [
                        [
                            'daily_volatility_pct[]',
                            'lista',
                            'Volatilidad esperada de cada rueda (%).',
                        ],
                        [
                            'cumulative_volatility_pct',
                            'número',
                            'Volatilidad acumulada al final del plazo (%).',
                        ],
                        [
                            'last_close · as_of',
                            'número · fecha',
                            'Desde qué precio y qué día.',
                        ],
                    ],
                    uso: 'El ancho del cono de "rango probable" del gráfico y el dato "Cuánto suele moverse".',
                },
                {
                    m: 'GET',
                    path: '/predict/direction/{symbol}',
                    d: 'Dirección binaria (SVM).',
                    req: [['symbol', 'ruta', 'Ticker.']],
                    res: [
                        ['signal', 'texto', 'alza o baja.'],
                        ['confidence', 'número', 'Confianza (0-1).'],
                        [
                            'horizon_days · last_close · as_of',
                            '—',
                            'Plazo, precio y fecha.',
                        ],
                    ],
                },
                {
                    m: 'GET',
                    path: '/predict/volatility/modal/{symbol} · /predict/direction/modal/{symbol}',
                    d: 'Lo mismo, pero corriendo en Modal.',
                    uso: 'Comparar la versión local con la de Modal.',
                },
            ],
        },
        {
            title: 'Cartera y seguimiento',
            items: [
                {
                    m: 'POST',
                    path: '/portfolio/recomendacion',
                    d: 'Rebalanceo con Black-Litterman.',
                    req: [
                        [
                            'perfil_riesgo',
                            'body',
                            'conservative, moderate o aggressive.',
                        ],
                        [
                            'tenencias[]',
                            'body',
                            'Tu cartera: ticker y cantidad.',
                        ],
                        [
                            'cartera_ancla',
                            'query (opcional)',
                            'propia (default) o equal_weight: desde qué reparto parte.',
                        ],
                        [
                            'max_nuevas · todas',
                            'query (opcional)',
                            'Cuántas acciones nuevas puede sumar (default 2) o todo el panel.',
                        ],
                        [
                            'model',
                            'query (opcional)',
                            'Qué modelo da las vistas.',
                        ],
                    ],
                    res: [
                        [
                            'pesos_recomendados',
                            'objeto',
                            'Ticker → peso sugerido (suman 1).',
                        ],
                        [
                            'detalle[]',
                            'lista',
                            'Por acción: peso actual y sugerido, pi (retorno de equilibrio), q (lo que estima el modelo), omega (incertidumbre), mu_bl (mezcla final).',
                        ],
                        [
                            'acciones_nuevas',
                            'lista',
                            'Las que no tenías y suma.',
                        ],
                        [
                            'rotacion',
                            'número',
                            'Qué parte de la cartera se movería.',
                        ],
                        [
                            'costo_estimado · costo_operacion',
                            'número',
                            'Lo que costaría moverla y la comisión por punta usada (0,6%).',
                        ],
                    ],
                    uso: 'La pantalla Rebalanceo.',
                },
                {
                    m: 'GET',
                    path: '/signals/history',
                    d: 'Historial de señales del paper trading.',
                    req: [
                        [
                            'symbols',
                            'query (opcional)',
                            'Tickers separados por coma; vacío = todos.',
                        ],
                        [
                            'limit',
                            'query (opcional)',
                            'Máximo de filas (hasta 5000), las más nuevas primero.',
                        ],
                    ],
                    res: [
                        [
                            'rows[]',
                            'lista',
                            'Cada predicción guardada: ticker, modelo, fecha, señal, precio de ese día y precio predicho.',
                        ],
                        [
                            'rows[].realized_close · resolved_at',
                            'número · fecha',
                            'Qué precio hubo al cumplirse el plazo (null si sigue pendiente).',
                        ],
                        [
                            'rows[].hit',
                            'bool o null',
                            'Si acertó (null si fue neutral o sigue pendiente).',
                        ],
                        [
                            'summary',
                            'objeto',
                            'Cuántas se evaluaron, cuántas acertaron y la última fecha.',
                        ],
                    ],
                    uso: 'Historial de señales y la tarjeta "Lo que predijo vs lo que pasó" de Acción.',
                },
                {
                    m: 'GET',
                    path: '/signals/track-record',
                    d: 'Qué hubiera pasado siguiendo las señales.',
                    res: [
                        [
                            'modelos[]',
                            'lista',
                            'Por modelo y versión: casos, desde y hasta.',
                        ],
                        [
                            'alza · baja',
                            'objeto',
                            'Cuántas veces dio cada señal y cuántas acertó, contra lo normal.',
                        ],
                        [
                            'retorno_medio_todas · curva',
                            'número · lista',
                            'Retorno de comprar cuando dice alza contra comprar todo, mes a mes.',
                        ],
                    ],
                    uso: 'La curva de Historial de señales.',
                },
            ],
        },
        {
            title: 'Servicio',
            items: [
                {
                    m: 'GET',
                    path: '/health',
                    d: 'Qué modelos están cargados.',
                    res: [
                        ['status', 'texto', 'ok.'],
                        [
                            'trend_models',
                            'objeto',
                            'Por modelo: si está cargado, versión y si es el default.',
                        ],
                    ],
                    uso: 'Semáforo de Servicios y el workflow que despierta a Render.',
                },
                {
                    m: 'GET',
                    path: '/models',
                    d: 'Lista de modelos registrados.',
                },
                {
                    m: 'GET',
                    path: '/models/diagnostics',
                    d: 'Métricas de evaluación de cada modelo.',
                    uso: 'Admin → Modelos (vía backend).',
                },
                {
                    m: 'POST',
                    path: '/predict',
                    d: 'Predicción genérica de ejemplo.',
                    req: [
                        ['symbol', 'body', 'Ticker.'],
                        ['features', 'body', 'Variables sueltas.'],
                    ],
                    res: [
                        [
                            'prediction',
                            'número',
                            'Salida del modelo de ejemplo.',
                        ],
                    ],
                },
            ],
        },
    ],
    modal: [
        {
            title: 'Una app por modelo (LSTM, XGBoost, Transformer, ARIMA, SVM, GARCH, GARCH-ANN)',
            items: [
                {
                    m: 'GET',
                    path: '…-main.modal.run?ticker=',
                    d: 'Predicción del modelo para el ticker.',
                    req: [
                        ['ticker', 'query', 'Ticker.'],
                        [
                            'horizon',
                            'query (opcional)',
                            'Ruedas (LSTM, XGBoost, Transformer).',
                        ],
                        [
                            'predictions · media_movil',
                            'query',
                            'Solo ARIMA: cuántos días y suavizado.',
                        ],
                    ],
                    res: [
                        [
                            'signal · predicted_close · horizon_days',
                            '—',
                            'Igual que api-ml (LSTM, XGBoost, Transformer, ARIMA).',
                        ],
                        ['signal · confidence', '—', 'SVM: dirección binaria.'],
                        [
                            'volatility_forecast[]',
                            'lista',
                            'GARCH y GARCH-ANN: volatilidad esperada por plazo.',
                        ],
                    ],
                    uso: 'Los modelos "(nube)" de Acción. Los consultan backend-website y api-ml.',
                },
                {
                    m: 'GET',
                    path: '…-prepare.modal.run?ticker=',
                    d: 'Entrena el modelo si todavía no existe.',
                    req: [['ticker', 'query', 'Ticker.']],
                    uso: 'Primer uso de LSTM, XGBoost o Transformer en Modal.',
                },
                {
                    m: 'CRON',
                    path: 'retrain_models · lun a vie 21:00',
                    d: 'Reentreno automático.',
                    uso: 'Mantiene los modelos de Modal al día con los precios nuevos.',
                },
            ],
        },
    ],
    be: [
        {
            title: 'Cuenta',
            items: [
                {
                    m: 'POST',
                    path: '/register',
                    d: 'Alta de usuario.',
                    req: [
                        [
                            'email · password · full_name',
                            'body',
                            'Datos de la cuenta (contraseña fuerte).',
                        ],
                        [
                            'risk_profile',
                            'body (opcional)',
                            'conservative, moderate o aggressive (sale del cuestionario).',
                        ],
                    ],
                    res: [
                        [
                            'code · message',
                            '—',
                            '200 y aviso de que llega el mail de verificación.',
                        ],
                    ],
                    uso: 'El registro de la landing.',
                },
                {
                    m: 'POST',
                    path: '/login',
                    d: 'Ingreso.',
                    req: [
                        ['email · password', 'body', 'Credenciales.'],
                        [
                            'totp_code',
                            'body (opcional)',
                            'Código de 6 dígitos si tiene doble factor.',
                        ],
                    ],
                    res: [
                        [
                            'token',
                            'texto o null',
                            'JWT para el resto de los pedidos.',
                        ],
                        [
                            'two_factor_required',
                            'bool',
                            'true si falta el código de doble factor.',
                        ],
                        [
                            'email_verification_required',
                            'bool',
                            'true si la contraseña es correcta pero el mail no está verificado.',
                        ],
                    ],
                },
                {
                    m: 'POST',
                    path: '/verify-email',
                    d: 'Verifica el mail.',
                    req: [['token', 'body', 'El token del link del mail.']],
                    res: [['code · message', '—', 'Resultado.']],
                },
                {
                    m: 'POST',
                    path: '/verify-email/resend',
                    d: 'Reenvía el mail de verificación.',
                    req: [['email', 'body', 'Mail de la cuenta.']],
                    uso: 'Con espera mínima entre reenvíos.',
                },
                {
                    m: 'POST',
                    path: '/forgot-password',
                    d: 'Pide el mail para cambiar la contraseña.',
                    req: [['email', 'body', 'Mail de la cuenta.']],
                    res: [
                        [
                            'code · message',
                            '—',
                            'Siempre el mismo mensaje, exista o no la cuenta (para no revelar mails).',
                        ],
                    ],
                },
                {
                    m: 'POST',
                    path: '/reset-password',
                    d: 'Cambia la contraseña.',
                    req: [
                        ['token', 'body', 'El del link (un solo uso, 1 hora).'],
                        ['new_password', 'body', 'Nueva contraseña.'],
                    ],
                },
                {
                    m: 'GET',
                    path: '/user',
                    d: 'Datos del usuario logueado.',
                    auth: TOKEN,
                    res: [
                        ['id · email · full_name', '—', 'Datos de la cuenta.'],
                        ['risk_profile', 'texto', 'Perfil de riesgo.'],
                        [
                            'has_to_redo_risk_profile',
                            'bool',
                            'true si venció el cuestionario (cada 6 meses).',
                        ],
                        ['role', 'texto', 'user o admin.'],
                        [
                            'two_factor_enabled',
                            'bool',
                            'Si tiene doble factor.',
                        ],
                    ],
                },
                {
                    m: 'DELETE',
                    path: '/user',
                    d: 'Borra la cuenta y todo lo asociado.',
                    auth: TOKEN,
                },
                {
                    m: 'PATCH',
                    path: '/user/risk-profile',
                    d: 'Cambia el perfil de riesgo.',
                    auth: TOKEN,
                    req: [
                        [
                            'risk_profile',
                            'body',
                            'conservative, moderate o aggressive.',
                        ],
                    ],
                    uso: 'Rehacer el cuestionario en Ajustes.',
                },
                {
                    m: 'POST',
                    path: '/user/2fa/setup',
                    d: 'Genera el secreto del doble factor.',
                    auth: TOKEN,
                    res: [
                        ['secret', 'texto', 'Clave del doble factor.'],
                        [
                            'otpauth_url',
                            'texto',
                            'Link para cargarla en la app autenticadora.',
                        ],
                        ['qr_base64', 'texto', 'Imagen del código QR.'],
                    ],
                },
                {
                    m: 'POST',
                    path: '/user/2fa/enable · /user/2fa/disable',
                    d: 'Activa o desactiva el doble factor.',
                    auth: TOKEN,
                    req: [['code', 'body', 'Código de 6 dígitos de la app.']],
                },
                {
                    m: 'POST',
                    path: '/user/preferences',
                    d: 'Guarda qué modelo usar para una acción.',
                    auth: TOKEN,
                    req: [
                        ['stock', 'body', 'Ticker.'],
                        ['model', 'body', 'Modelo de Modal elegido.'],
                    ],
                    res: [['user_id · stock · model', '—', 'Lo guardado.']],
                },
                {
                    m: 'DELETE',
                    path: '/user/preferences/{stock}',
                    d: 'Vuelve al modelo por defecto para esa acción.',
                    auth: TOKEN,
                },
            ],
        },
        {
            title: 'Cartera',
            items: [
                {
                    m: 'GET',
                    path: '/user/shares',
                    d: 'Tus acciones.',
                    auth: TOKEN,
                    res: [
                        [
                            'shares[]',
                            'lista',
                            'id, ticker, cantidad, precio de entrada y fecha de alta.',
                        ],
                    ],
                },
                {
                    m: 'POST',
                    path: '/user/shares',
                    d: 'Carga una acción.',
                    auth: TOKEN,
                    req: [
                        [
                            'ticker · quantity',
                            'body',
                            'Ticker y cantidad (> 0).',
                        ],
                        [
                            'entry_price',
                            'body (opcional)',
                            'Precio pagado; si no viene, usa el último cierre.',
                        ],
                    ],
                    res: [
                        [
                            'id · ticker · quantity · entry_price · created_at',
                            '—',
                            'La tenencia creada (201).',
                        ],
                    ],
                    uso: 'Valida contra /model-ready-tickers del data-colector (422 si no tiene historia) y registra la compra en el historial de operaciones.',
                },
                {
                    m: 'PUT',
                    path: '/user/shares/{id}',
                    d: 'Cambia la cantidad.',
                    auth: TOKEN,
                    req: [
                        ['id', 'ruta', 'Id de la tenencia.'],
                        ['quantity', 'body', 'Nueva cantidad.'],
                        [
                            'entry_price',
                            'body (opcional)',
                            'Precio de la compra si la cantidad sube.',
                        ],
                    ],
                    uso: 'Registra la compra o venta en el historial y recalcula el precio promedio.',
                },
                {
                    m: 'DELETE',
                    path: '/user/shares/{id}',
                    d: 'Saca la acción de la cartera (registra la venta).',
                    auth: TOKEN,
                },
                {
                    m: 'GET',
                    path: '/user/shares/pnl',
                    d: 'Ganancia o pérdida.',
                    auth: TOKEN,
                    res: [
                        [
                            'shares[]',
                            'lista',
                            'Por acción: precio de entrada y actual, ganancia en $ y %, y peso en la cartera.',
                        ],
                        [
                            'portfolio',
                            'objeto',
                            'Total invertido, valor actual y ganancia total.',
                        ],
                    ],
                    uso: 'Resumen y Cartera.',
                },
                {
                    m: 'GET',
                    path: '/user/shares/balance',
                    d: 'Valor de la cartera hoy.',
                    auth: TOKEN,
                    res: [
                        [
                            '[]',
                            'lista',
                            'Por acción: cantidad, precio de entrada y actual, costo, valor actual y ganancia en $ y %.',
                        ],
                    ],
                },
                {
                    m: 'GET',
                    path: '/user/shares/balance/history',
                    d: 'Valor de la cartera día por día.',
                    auth: TOKEN,
                    res: [
                        ['[].date', 'fecha', 'Día.'],
                        [
                            '[].total_current_value',
                            'número',
                            'Lo que valía la cartera ese día.',
                        ],
                        [
                            '[].total_cost_basis',
                            'número',
                            'Lo que habías pagado por lo que tenías.',
                        ],
                        [
                            '[].total_profit_loss',
                            'número',
                            'Diferencia entre las dos.',
                        ],
                    ],
                    uso: 'El gráfico de evolución del Resumen (reconstruido con el historial de operaciones).',
                },
                {
                    m: 'GET',
                    path: '/user/shares/portfolio/recomendacion',
                    d: 'Rebalanceo.',
                    auth: TOKEN + ' y perfil de riesgo',
                    req: [
                        [
                            'cartera_ancla · max_nuevas · todas · model',
                            'query (opcional)',
                            'Se pasan tal cual a api-ml.',
                        ],
                    ],
                    res: [
                        [
                            '…',
                            '—',
                            'Lo mismo que /portfolio/recomendacion de api-ml, armado con tu cartera y tu perfil.',
                        ],
                    ],
                },
            ],
        },
        {
            title: 'Análisis (pasan a api-ml, Modal o data-colector)',
            items: [
                {
                    m: 'GET',
                    path: '/user/shares/trends',
                    d: 'Señal de cada acción de tu cartera.',
                    auth: TOKEN + ' y perfil de riesgo',
                    res: [
                        [
                            'trends[]',
                            'lista',
                            'Por acción: señal, precio predicho, plazo, RSI, modelo y fecha.',
                        ],
                        [
                            'trends[].available · reason · retryable',
                            '—',
                            'Si no se pudo predecir, por qué y si conviene reintentar.',
                        ],
                    ],
                    uso: 'Las señales de Resumen y Cartera. Se cachea por día en ticker_trend_cache.',
                },
                {
                    m: 'GET',
                    path: '/user/shares/{ticker}/trends/compare',
                    d: 'Todos los modelos de una acción.',
                    auth: TOKEN + ' y perfil de riesgo',
                    req: [['ticker', 'ruta', 'Ticker.']],
                    res: [
                        [
                            'predictions',
                            'objeto',
                            'Los modelos de api-ml más los de Modal, cada uno con available y reason.',
                        ],
                        [
                            'consensus',
                            'objeto',
                            'Lectura combinada ajustada a tu perfil.',
                        ],
                    ],
                    uso: 'Acción. Se cachea en ticker_compare_cache; los modelos que ocultó el admin los saca el frontend.',
                },
                {
                    m: 'GET',
                    path: '/user/shares/{ticker}/history',
                    d: 'Cierres diarios.',
                    auth: TOKEN,
                    res: [['prices[]', 'lista', 'ts (ms) y close.']],
                    uso: 'Gráfico de línea de Acción y cálculos de riesgo.',
                },
                {
                    m: 'GET',
                    path: '/user/shares/{ticker}/candles',
                    d: 'Velas diarias.',
                    auth: TOKEN,
                    req: [
                        [
                            'limit',
                            'query (opcional)',
                            'Cuántas ruedas recientes.',
                        ],
                    ],
                    res: [
                        [
                            'candles[]',
                            'lista',
                            'date, open, high, low, close y volume.',
                        ],
                    ],
                    uso: 'Gráfico de velas de Acción.',
                },
                {
                    m: 'GET',
                    path: '/user/shares/{ticker}/explain',
                    d: 'SHAP de XGBoost (pasa a api-ml).',
                    auth: TOKEN,
                },
                {
                    m: 'GET',
                    path: '/user/shares/{ticker}/fair-value',
                    d: 'Precio estimado por regresión (pasa a api-ml).',
                    auth: TOKEN,
                },
                {
                    m: 'GET',
                    path: '/user/shares/{ticker}/volatility',
                    d: 'Volatilidad esperada (pasa a api-ml).',
                    auth: TOKEN,
                    req: [
                        ['horizon', 'query (opcional)', 'Ruedas, de 1 a 60.'],
                    ],
                },
                {
                    m: 'GET',
                    path: '/user/ranking',
                    d: 'Ranking del día (pasa a api-ml).',
                    auth: TOKEN,
                },
                {
                    m: 'GET',
                    path: '/user/signals/history',
                    d: 'Historial de señales de las acciones de tu cartera.',
                    auth: TOKEN,
                    res: [
                        [
                            'rows · summary',
                            '—',
                            'Lo mismo que /signals/history de api-ml, filtrado a tus acciones (hasta 3000 filas).',
                        ],
                    ],
                },
                {
                    m: 'GET',
                    path: '/user/signals/track-record',
                    d: 'Aciertos por modelo (pasa a api-ml).',
                    auth: TOKEN,
                },
                {
                    m: 'GET',
                    path: '/market/series',
                    d: 'Series de mercado.',
                    auth: TOKEN,
                    res: [
                        [
                            'series[]',
                            'lista',
                            'CCL, MEP, riesgo país, TPM, BADLAR, reservas, TNX, oro y petróleo, cada una con sus puntos.',
                        ],
                        [
                            'unavailable[]',
                            'lista',
                            'Las que fallaron y por qué.',
                        ],
                    ],
                    uso: 'Pantalla Mercado y conversión a dólares en Acción.',
                },
                {
                    m: 'GET',
                    path: '/shares',
                    d: 'Catálogo de acciones.',
                    res: [
                        [
                            'shares[]',
                            'lista',
                            'id, ticker y si se puede predecir.',
                        ],
                    ],
                    uso: 'Buscador y alta de acciones.',
                },
                {
                    m: 'GET',
                    path: '/shares/{ticker}/sector',
                    d: 'Sector de la empresa (pasa a data-colector).',
                },
                {
                    m: 'GET',
                    path: '/shares/update',
                    d: 'Sincroniza el catálogo con data-colector.',
                },
                {
                    m: 'GET',
                    path: '/models/hidden',
                    d: 'Modelos que el admin ocultó.',
                    auth: TOKEN,
                    res: [
                        [
                            'hidden',
                            'lista',
                            'Claves de los modelos ocultos (ej: macro).',
                        ],
                    ],
                    uso: 'El frontend saca esos modelos de todas las pantallas.',
                },
            ],
        },
        {
            title: 'Alertas',
            items: [
                {
                    m: 'GET',
                    path: '/user/alerts/subscriptions',
                    d: 'A qué estás suscripto.',
                    auth: TOKEN,
                    res: [
                        [
                            'portfolio',
                            'bool',
                            'true si recibís alertas de toda tu cartera.',
                        ],
                        ['tickers', 'lista', 'Acciones sueltas que seguís.'],
                    ],
                },
                {
                    m: 'POST',
                    path: '/user/alerts/subscriptions/{ticker}',
                    d: 'Seguir una acción.',
                    auth: TOKEN,
                    res: [
                        [
                            'id · ticker',
                            '—',
                            'La suscripción creada (409 si ya existía).',
                        ],
                    ],
                    uso: 'Botón "Avisarme si cambia" de Acción.',
                },
                {
                    m: 'POST',
                    path: '/user/alerts/subscriptions/portfolio',
                    d: 'Seguir toda la cartera.',
                    auth: TOKEN,
                },
                {
                    m: 'DELETE',
                    path: '/user/alerts/subscriptions/{ticker} · /portfolio',
                    d: 'Dejar de seguir.',
                    auth: TOKEN,
                },
            ],
        },
        {
            title: 'Admin',
            items: [
                {
                    m: 'GET',
                    path: '/admin/health',
                    d: 'Estado de cada servicio.',
                    auth: ADMIN,
                    res: [
                        ['all_up', 'bool', 'true si todos responden.'],
                        [
                            'services[]',
                            'lista',
                            'Por servicio: up, down o not_configured, status HTTP, latencia y error.',
                        ],
                    ],
                    uso: 'Admin → Servicios y los puntitos de este diagrama.',
                },
                {
                    m: 'GET',
                    path: '/admin/models',
                    d: 'Diagnóstico de los modelos (pasa a api-ml).',
                    auth: ADMIN,
                },
                {
                    m: 'PUT · DELETE',
                    path: '/admin/models/{model}/hidden',
                    d: 'Ocultar o mostrar un modelo a los usuarios.',
                    auth: ADMIN,
                    req: [
                        [
                            'model',
                            'ruta',
                            'Clave del modelo (ej: macro, xgboost-modal).',
                        ],
                    ],
                    res: [
                        ['hidden', 'lista', 'Cómo quedó la lista de ocultos.'],
                    ],
                    uso: 'Admin → Modelos.',
                },
                {
                    m: 'POST',
                    path: '/admin/user-shares/backfill',
                    d: 'Completa el historial de operaciones.',
                    auth: ADMIN,
                    res: [
                        [
                            'operations_seeded · entry_prices_updated · entry_prices_skipped',
                            'entero',
                            'Cuántas operaciones creó y cuántos precios de entrada completó.',
                        ],
                    ],
                    uso: 'Para carteras cargadas antes de que existiera el historial de operaciones.',
                },
            ],
        },
    ],
    bedb: [
        {
            title: 'Tablas principales',
            items: [
                {
                    m: 'TABLA',
                    path: 'users',
                    d: 'Cuenta: mail, contraseña (hash), rol, doble factor y tokens de verificación y de recupero.',
                },
                {
                    m: 'TABLA',
                    path: 'user_investing_profiles',
                    d: 'Perfil de riesgo y hasta cuándo vale (6 meses).',
                },
                {
                    m: 'TABLA',
                    path: 'shares · user_shares',
                    d: 'Catálogo de acciones y lo que tiene cada usuario.',
                },
                {
                    m: 'TABLA',
                    path: 'user_share_operations',
                    d: 'Cada compra y venta con precio y fecha (para el P&L y la evolución).',
                },
                {
                    m: 'TABLA',
                    path: 'user_preferences',
                    d: 'Modelo elegido por acción.',
                },
                {
                    m: 'TABLA',
                    path: 'alert_subscriptions',
                    d: 'Suscripciones a alertas (ticker o toda la cartera).',
                },
                {
                    m: 'TABLA',
                    path: 'ticker_trend_cache · ticker_compare_cache',
                    d: 'Cachés de predicciones para no recalcular en cada pedido.',
                },
                {
                    m: 'TABLA',
                    path: 'hidden_models',
                    d: 'Modelos ocultos por el admin.',
                },
                {
                    m: 'TABLA',
                    path: 'retro_sprint · retro_cards · retro_archives',
                    d: 'Tablero de retro del equipo.',
                },
            ],
        },
    ],
    mail: [
        {
            title: 'Mails que manda backend-website',
            items: [
                {
                    m: 'MAIL',
                    path: 'FinanciAr: verifica tu cuenta',
                    d: 'Al registrarse, con el link de verificación.',
                },
                {
                    m: 'MAIL',
                    path: 'FinanciAr: restablece tu contrasena',
                    d: 'Link de un solo uso, vence en 1 hora.',
                },
                {
                    m: 'MAIL',
                    path: 'FinanciAr: {ticker} cambio de tendencia',
                    d: 'Cuando cambia la señal de una acción que seguís.',
                },
                {
                    m: 'MAIL',
                    path: 'FinanciAr: tu resumen semanal de inversiones',
                    d: 'Los lunes: cómo le fue a cada acción de tu cartera en la semana.',
                },
            ],
        },
    ],
    fe: [
        {
            title: 'Pantallas',
            items: [
                {
                    m: 'PÁG',
                    path: '/home',
                    d: 'Resumen: valor de la cartera, evolución y señales.',
                },
                {
                    m: 'PÁG',
                    path: '/cartera',
                    d: 'Tus acciones, P&L y alta de acciones.',
                },
                {
                    m: 'PÁG',
                    path: '/accion/{ticker}',
                    d: 'Análisis completo de una acción.',
                },
                { m: 'PÁG', path: '/rebalanceo', d: 'Black-Litterman.' },
                { m: 'PÁG', path: '/ranking', d: 'Ranking del día.' },
                {
                    m: 'PÁG',
                    path: '/historial',
                    d: 'Historial de señales y aciertos.',
                },
                {
                    m: 'PÁG',
                    path: '/riesgo · /mercado · /terminal',
                    d: 'Riesgo de la cartera, macro y modo terminal.',
                },
                {
                    m: 'PÁG',
                    path: '/alertas · /ajustes',
                    d: 'Avisos y configuración.',
                },
                {
                    m: 'PÁG',
                    path: '/admin/*',
                    d: 'Arquitectura, servicios, modelos y confiabilidad.',
                },
            ],
        },
    ],
};
