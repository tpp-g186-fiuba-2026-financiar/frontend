// Contenido de "De punta a punta", sacado del codigo: workflows de api-ml
// (.github/workflows), crons de Modal (repo models), retrain_guard.py,
// xgb_trend.py, registry.py, data.py y backend-website.

export const PASOS: Array<{ t: string; quien: string; d: string }> = [
    {
        t: 'Recolectar',
        quien: 'data-colector (Rust) → PostgreSQL',
        d: 'Baja la lista de acciones de BYMA (cada 60 min) y Rava (cada 10 h), 10 años de velas diarias de Yahoo, oro y petróleo (cada 6 h), y a demanda las series macro: dólares y riesgo país (ArgentinaDatos), tasas y reservas (BCRA), bonos del Tesoro de EE.UU. Corrige a mano las acciones donde Yahoo trae datos malos (A3, CARC, ECOG…) con BYMA + Rava.',
    },
    {
        t: 'Entrenar',
        quien: 'GitHub Actions (api-ml) · Modal (repo models)',
        d: 'Crons después del cierre: LSTM y Transformer v1 todos los días hábiles; XGBoost, Contexto, Macro y Transformer V2 una vez por mes. Las copias de Modal tienen su propio cron.',
    },
    {
        t: 'Validar y promover',
        quien: 'retrain_guard.py · gate de AUC / IC',
        d: 'El candidato se mide sobre datos que no vio. Si no le gana al vigente o no supera el piso, se descarta. Si gana, el bot hace commit del artefacto y Render redespliega api-ml.',
    },
    {
        t: 'Precalcular',
        quien: 'Paper trading diario, 18:00',
        d: 'Corre todos los modelos sobre todas las acciones, registra cada señal en el ledger (para medir aciertos reales después) y guarda la comparación completa en compare_snapshot.json. La web la lee de ahí en vez de recalcular.',
    },
    {
        t: 'Servir',
        quien: 'api-ml (FastAPI) · backend-website (Rust)',
        d: 'api-ml expone predicción, comparación, consenso, Black-Litterman, GARCH y explicaciones. backend-website autentica, guarda carteras, junta api-ml + Modal y cachea en Postgres lo pedido en el día.',
    },
    {
        t: 'Mostrar y avisar',
        quien: 'Frontend (React) · mails',
        d: 'La web solo habla con backend-website. Un job diario revisa si cambió la señal de tus acciones y te avisa por mail; los lunes llega el resumen semanal de la cartera.',
    },
];

export const DIA: Array<{
    h: string;
    t: string;
    d: string;
    k: 'dato' | 'train' | 'pre' | 'mail';
}> = [
    {
        h: 'todo el día',
        t: 'data-colector refresca',
        d: 'Lista de tickers cada 60 min, commodities cada 6 h, Rava cada 10 h, velas cuando alguien las pide.',
        k: 'dato',
    },
    {
        h: '17:00',
        t: 'Cierra BYMA · reentreno diario',
        d: 'GitHub Actions (retrain.yml): LSTM y Transformer v1, con control de promoción.',
        k: 'train',
    },
    {
        h: '18:00',
        t: 'Paper trading + snapshot',
        d: 'paper-trading.yml: todas las señales del día al ledger y compare_snapshot.json; después, el reporte de calidad.',
        k: 'pre',
    },
    {
        h: '20:00',
        t: 'Modal: lstm-modal',
        d: 'modal.Cron de lunes a viernes. Promueve si mejora el acierto direccional.',
        k: 'train',
    },
    {
        h: '21:00',
        t: 'Modal: xgboost-modal',
        d: 'Refresca la foto de pares; reentrena cada 28 días si AUC fuera de muestra ≥ 0,52.',
        k: 'train',
    },
    {
        h: '21:30',
        t: 'Modal: svm-modal',
        d: 'Clasificador compra / venta.',
        k: 'train',
    },
    {
        h: '22:00',
        t: 'Modal: arima-modal',
        d: 'Promueve si baja el error (MAE), no por acierto direccional.',
        k: 'train',
    },
    {
        h: '23:00',
        t: 'Modal: garch',
        d: 'Volatilidad esperada (no da dirección).',
        k: 'train',
    },
    {
        h: 'cada 24 h',
        t: 'Alertas de señal',
        d: 'backend-website revisa si cambió la señal de cada acción de cada cartera y manda el mail (y deja la caché de tendencias al día).',
        k: 'mail',
    },
    {
        h: 'lunes',
        t: 'Resumen semanal',
        d: 'Mail con cómo le fue a la cartera en la semana.',
        k: 'mail',
    },
    {
        h: 'día 1 y 2 del mes',
        t: 'Reentrenos mensuales',
        d: 'Macro y Transformer V2 (19:00 del día 1), Contexto (20:00 del día 1), XGBoost y XGBoost-5 (20:00 del día 2).',
        k: 'train',
    },
];

export interface Entrenamiento {
    modelo: string;
    algo: string;
    donde: string;
    archivo: string;
    cuando: string;
    datos: string;
    gate: string;
}

export const ENTRENAMIENTOS: Entrenamiento[] = [
    {
        modelo: 'LSTM',
        algo: 'Red recurrente, ventana de 30 ruedas × 8 variables, retorno a 5 ruedas',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain.yml → src/train.py',
        cuando: 'Lunes a viernes 17:00',
        datos: 'Todas las acciones del data-colector, ~3 años (750 ruedas)',
        gate: 'Acierto direccional walk-forward pooleado (últimas 60 ruedas, día por día) mayor que el del vigente',
    },
    {
        modelo: 'Transformer v1',
        algo: 'Encoder con token [CLS], mismas variables que LSTM',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain.yml → src/train_transformer.py',
        cuando: 'Lunes a viernes 17:00',
        datos: 'Igual que LSTM',
        gate: 'Igual que LSTM',
    },
    {
        modelo: 'XGBoost (20 ruedas)',
        algo: 'Clasificador de panel: 3 semillas + logística, 112 variables con rangos entre pares',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain-xgb.yml → src/train_xgb.py',
        cuando: 'Día 2 de cada mes, 20:00',
        datos: '20 líderes del Merval desde Yahoo, 2016 a hoy',
        gate: 'AUC fuera de muestra (último 25%, 4 tramos con purga) ≥ 0,52',
    },
    {
        modelo: 'XGBoost-5',
        algo: 'El mismo modelo de panel, a 5 ruedas',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain-xgb.yml → train_xgb --horizon 5',
        cuando: 'Día 2 de cada mes, 20:00',
        datos: 'Igual que XGBoost',
        gate: 'AUC fuera de muestra ≥ 0,50',
    },
    {
        modelo: 'Contexto',
        algo: 'HistGradientBoosting con las variables de XGBoost',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain-contexto.yml → src/train_context.py',
        cuando: 'Día 1 de cada mes, 20:00',
        datos: 'Líderes desde Yahoo',
        gate: 'AUC fuera de muestra ≥ 0,52',
    },
    {
        modelo: 'Macro',
        algo: 'Panel con dólares, riesgo país, tasas y reservas',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain-macro.yml → src/train_macro.py',
        cuando: 'Día 1 de cada mes, 19:00',
        datos: 'Velas + series macro del data-colector',
        gate: 'AUC fuera de muestra ≥ 0,52 (oculto por defecto en la web)',
    },
    {
        modelo: 'Transformer V2',
        algo: 'Panel: ordena las 20 líderes entre sí, en dólares CCL',
        donde: 'GitHub Actions, api-ml',
        archivo: 'retrain-transformer-v2.yml',
        cuando: 'Día 1 de cada mes, 19:00',
        datos: 'Velas + CCL del data-colector',
        gate: 'IC (correlación de orden) en las últimas ruedas mejor que el azar; si pasa, reentrena con todo',
    },
    {
        modelo: 'ARIMA',
        algo: 'Serie de tiempo univariada',
        donde: 'api-ml, en cada pedido',
        archivo: 'src/arima_trend.py',
        cuando: 'No se entrena: se ajusta al vuelo',
        datos: 'Solo el precio de esa acción',
        gate: '—',
    },
    {
        modelo: 'Copias en Modal',
        algo: 'lstm, xgboost, arima, svm, garch (una por ticker o pooled)',
        donde: 'Modal (repo models)',
        archivo: 'modelos/*_model.py · modal.Cron',
        cuando: 'Lunes a viernes 20:00 a 23:00',
        datos: 'data-colector deployado',
        gate: 'Solo promueve si mejora: acierto direccional (lstm, xgboost) o MAE (arima)',
    },
];

export const VALIDACION: Array<{ t: string; d: string }> = [
    {
        t: 'Cortes temporales',
        d: 'Si el set de prueba tuviera días anteriores a los de entrenamiento, el modelo "vería el futuro" y el resultado sería falso. Todos los cortes son temporales: se entrena con el pasado y se mide con lo que vino después.',
    },
    {
        t: 'La purga',
        d: 'El objetivo de un día mira 20 ruedas para adelante. Sin purga, las últimas 20 ruedas de entrenamiento comparten futuro con el inicio del tramo de prueba. Por eso entre entrenar y medir se tiran tantas ruedas como el horizonte.',
    },
    {
        t: 'LSTM y Transformer v1: 85 / 15 por acción',
        d: 'Cada serie se corta en el 85% de sus ventanas: lo anterior entrena, el 15% final valida. Ese número es ruidoso (un solo corte); para decidir si el modelo nuevo reemplaza al viejo se usa el walk-forward de las últimas 60 ruedas, día por día, de todas las acciones juntas.',
    },
    {
        t: 'Pesos que decaen y variables "as of"',
        d: 'En los modelos de panel los días más viejos pesan menos. Las variables externas (tasa, macro, rango entre pares) se alinean con el último valor conocido a esa fecha (forward-fill, con el retraso de publicación de cada serie): nunca un dato publicado después.',
    },
    {
        t: 'Backtest que se muestra en la web',
        d: 'El comparador muestra, para LSTM y XGBoost, el acierto de las últimas 60 ruedas recalculado en vivo con cortes móviles; los de panel muestran sus métricas fuera de muestra. Aparte, el ledger del paper trading guarda las señales reales de cada día y mide si acertaron cuando pasa el horizonte.',
    },
    {
        t: 'Contra qué se compara',
        d: 'Contra "siempre sube" (la acción sube ~55-60% de las veces a 20 ruedas). Un modelo que no supera esa tasa base no aporta, aunque su accuracy parezca alto. Por eso la señal se reporta como "alza acierta X% vs base Y%".',
    },
];

export const SEQ_ACTORES: Array<{ id: string; t: string; s: string }> = [
    { id: 'fe', t: 'Frontend', s: 'React' },
    { id: 'be', t: 'backend-website', s: 'Rust · axum' },
    { id: 'pg', t: 'PostgreSQL', s: 'cachés del día' },
    { id: 'ml', t: 'api-ml', s: 'FastAPI · registry' },
    { id: 'dc', t: 'data-colector', s: 'o Yahoo de respaldo' },
    { id: 'md', t: 'Modal', s: 'modelos remotos' },
];

export const SECUENCIA: Array<{
    de: string;
    a: string;
    t: string;
    d: string;
    tipo?: 'resp' | 'cache';
}> = [
    {
        de: 'fe',
        a: 'be',
        t: 'GET /trends/compare (JWT)',
        d: 'La pantalla pide la comparación con el token en el header; el middleware de auth valida el JWT antes del handler.',
    },
    {
        de: 'be',
        a: 'pg',
        t: '¿comparación de hoy?',
        d: 'Busca en ticker_compare_cache una del mismo día (hora de Buenos Aires). Completa vale todo el día; con algún modelo caído, 15 minutos.',
        tipo: 'cache',
    },
    {
        de: 'pg',
        a: 'be',
        t: 'hit → responde ya',
        d: 'Si hay, se devuelve sin tocar a nadie más: es el caso común.',
        tipo: 'resp',
    },
    {
        de: 'be',
        a: 'ml',
        t: 'GET /predict/trend/compare/{t}',
        d: 'Si no hay, le pide a api-ml (timeout 75 s), en paralelo con el consenso y los modelos de Modal.',
    },
    {
        de: 'be',
        a: 'md',
        t: 'GET ?ticker= (en paralelo)',
        d: 'Las copias en Modal (lstm, xgboost, arima, svm, garch) se piden a la vez, cada una con su timeout.',
    },
    {
        de: 'ml',
        a: 'ml',
        t: 'caché / snapshot',
        d: 'api-ml primero mira su caché en memoria del día y el compare_snapshot.json de las 18 hs. Si está vigente, responde sin correr nada.',
        tipo: 'cache',
    },
    {
        de: 'ml',
        a: 'dc',
        t: 'POST /historical-data/{t}',
        d: 'Si no, baja el histórico (5 s conectar + 15 s responder). Si falla, circuit breaker y respaldo de Yahoo. Los históricos quedan 30 min en memoria.',
    },
    {
        de: 'dc',
        a: 'ml',
        t: 'velas OHLCV',
        d: 'Velas diarias ajustadas por dividendos y splits.',
        tipo: 'resp',
    },
    {
        de: 'ml',
        a: 'ml',
        t: 'predict_on(df) × cada modelo',
        d: 'El registry corre cada modelo cargado sobre el mismo histórico (comparación justa). Cada predict tarda milisegundos; un modelo que falla se marca "no disponible" sin tumbar al resto.',
    },
    {
        de: 'ml',
        a: 'ml',
        t: 'señal, RSI, backtest',
        d: 'derive_trend_output arma la salida común (señal alza / baja / neutral, precio esperado, RSI y condición); para LSTM y XGBoost se suma el backtest en vivo.',
    },
    {
        de: 'ml',
        a: 'be',
        t: 'predicciones por modelo',
        d: 'JSON con cada modelo y cuál es el mejor según su backtest (default_model).',
        tipo: 'resp',
    },
    {
        de: 'md',
        a: 'be',
        t: 'predicciones remotas',
        d: 'Se traducen al mismo formato que las locales.',
        tipo: 'resp',
    },
    {
        de: 'be',
        a: 'pg',
        t: 'guarda la comparación',
        d: 'Se guarda en ticker_compare_cache marcando si respondieron todos.',
    },
    {
        de: 'be',
        a: 'fe',
        t: 'JSON unificado',
        d: 'Todas las predicciones juntas. La pantalla saca los modelos que el admin ocultó (GET /models/hidden) y dibuja tabla, gráfico y aciertos.',
        tipo: 'resp',
    },
];
