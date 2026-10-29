// Dónde se aplica cada patrón en cada servicio, con el archivo y un extracto
// del código real (api-ml, backend-website, data-colector, frontend).

export type Servicio =
    | 'api-ml'
    | 'backend-website'
    | 'data-colector'
    | 'frontend';

export interface Uso {
    servicio: Servicio;
    titulo: string;
    que: string;
    archivo: string;
    codigo: string;
}

export const USOS: Record<
    'strategy' | 'adapter' | 'composite' | 'factory' | 'micro',
    Uso[]
> = {
    strategy: [
        {
            servicio: 'api-ml',
            titulo: 'Un contrato para todos los modelos',
            que: 'Los 8 modelos implementan TrendPredictor. El comparador, el consenso, el paper trading y el backtest los recorren sin saber qué algoritmo hay detrás; sumar un modelo no toca ninguno de ellos.',
            archivo: 'src/registry.py · TrendPredictor, TrendRegistry.resolve',
            codigo: `class TrendPredictor(Protocol):
    @property
    def version(self) -> str: ...
    def predict_df(self, df: pd.DataFrame) -> dict: ...

for name, service in self._services.items():
    result = service.predict_on(df, symbol)`,
        },
        {
            servicio: 'data-colector',
            titulo: 'Fuentes de tasas intercambiables',
            que: 'Yahoo (bonos de EE.UU.), la API del BCRA y ArgentinaDatos exponen la misma función fetch_series(serie) y devuelven el mismo InterestRatePoint. El endpoint elige la fuente según la ruta; la caché, la persistencia y la respuesta son las mismas para las tres.',
            archivo:
                'src/interest_rates/us_client.rs · ar_client.rs · argentinadatos_client.rs',
            codigo: `// mismo contrato en los tres módulos
pub async fn fetch_series(series: &str)
    -> Result<Vec<InterestRatePoint>, String>

/interest-rate/us/TNX      -> us_client::fetch_series
/interest-rate/ar/BADLAR   -> ar_client::fetch_series
/macro/argdatos/CCL        -> argentinadatos_client::fetch_series`,
        },
        {
            servicio: 'backend-website',
            titulo: 'Modelo preferido por acción',
            que: 'Cada usuario elige con qué modelo ver cada acción (tabla user_preferences). Al armar las tendencias, el backend resuelve la estrategia de esa acción y consulta la URL de ese modelo; sin preferencia, usa lstm-modal.',
            archivo:
                'src/endpoints/user_share/trend_logic.rs · preferred_model, modal_url',
            codigo: `fn modal_url(model: &str) -> String {
    let (env, default) = match model {
        "arima-modal" => ("MODAL_ARIMA_URL", DEFAULT_ARIMA_URL),
        "xgboost-modal" => ("MODAL_XGBOOST_URL", DEFAULT_XGBOOST_URL),
        _ => ("MODAL_LSTM_URL", DEFAULT_LSTM_URL),
    };
    std::env::var(env).unwrap_or_else(|_| default.to_string())
}`,
        },
    ],
    adapter: [
        {
            servicio: 'api-ml',
            titulo: 'Modelos de Modal con otro formato',
            que: 'RemoteTrendService envuelve la llamada HTTP y aplica un traductor por modelo: el SVM responde Buy/Sell y el ARIMA una lista de precios. Del otro lado sale un TrendResponse, igual al de los modelos locales.',
            archivo:
                'src/registry.py · RemoteTrendService · src/arima_trend.py',
            codigo: `registry.register_remote(
    "svm-modal", settings.modal_svm_url,
    translator=translate_modal_svm_response,
)
payload = call_modal(self.base_url, symbol)
result = self._translator(payload)`,
        },
        {
            servicio: 'data-colector',
            titulo: 'Velas de Yahoo, BYMA y Rava a una sola fila',
            que: 'Cada fuente trae las velas en su formato: yfinance-rs con montos tipados, BYMA con arrays paralelos (t, o, h, l, c, v) y Rava con fechas en texto. Se adaptan a TickerHistoricalData / DailyCandle antes de guardarlas, así la base y los endpoints tienen un solo formato.',
            archivo:
                'src/persistence/ticker_repository.rs · from_candle · src/history_corrections.rs',
            codigo: `impl TickerHistoricalData {
    pub fn from_candle(candle: &Candle, ticker: &str) -> Self {
        Self {
            ticker: ticker.to_string(),
            ts: candle.ts.timestamp_millis(),
            open_amount: candle.open.amount(),
            ...
        }
    }
}`,
        },
        {
            servicio: 'backend-website',
            titulo: 'GARCH, SVM y claims del JWT',
            que: 'fetch_svm y fetch_garch llevan las respuestas de Modal al formato del comparador (GARCH no da dirección: se marca como volatilidad). El middleware convierte los claims del token en un AuthUser que reciben los handlers.',
            archivo:
                'compare_trend_logic.rs · fetch_svm, fetch_garch · src/auth/middleware.rs',
            codigo: `impl From<Claims> for AuthUser {
    fn from(claims: Claims) -> Self {
        Self { user_id: claims.sub, email: claims.email }
    }
}`,
        },
    ],
    composite: [
        {
            servicio: 'backend-website',
            titulo: 'Árbol de routers con capas',
            que: 'La API se arma componiendo routers: cada grupo (públicas, con sesión, con perfil de riesgo, admin) es un Router con su propia capa de seguridad, y se combinan con merge en un Router raíz. Un pedido atraviesa las capas de todos los grupos que lo contienen.',
            archivo:
                'src/lib.rs · normal_routes, auth_only, profile_gated, admin_routes, protected',
            codigo: `let admin_routes = Router::new()
    .route("/admin/health", get(...))
    .route_layer(from_fn_with_state(state.clone(), require_admin));

let protected = auth_only
    .merge(profile_gated)
    .merge(admin_routes)
    .route_layer(from_fn_with_state(state.clone(), require_auth));

Router::new().merge(normal_routes).merge(protected)`,
        },
        {
            servicio: 'api-ml',
            titulo: 'Ensamble de modelos',
            que: 'EnsembleTrendService es un modelo hecho de modelos: misma interfaz que una hoja, promedia con pesos los retornos de sus miembros. Se usó para medir el ensamble en el backtest; no está en producción porque no superó a XGBoost solo.',
            archivo:
                'src/registry.py · EnsembleTrendService, register_ensemble',
            codigo: `for svc, weight in self._members.values():
    r = svc.predict_on(df, symbol)
    log_returns.append(np.log(r["predicted_close"] / r["last_close"]))
avg = np.average(log_returns, weights=weights)
return derive_trend_output(df, avg, horizon)`,
        },
        {
            servicio: 'frontend',
            titulo: 'Rutas anidadas dentro del shell',
            que: 'Las pantallas se declaran como un árbol de rutas: el layout (AppShell, con menú y barra superior) es el nodo padre y cada página es una hoja que se renderiza dentro de él. Usuario y admin comparten el mismo shell con distinto menú.',
            archivo: 'src/next/routes.tsx · AppShell',
            codigo: `<Route path="/admin" element={shell(true)}>
    <Route path="arquitectura" element={<Arquitectura />} />
    <Route path="proyecto" element={<Proyecto />} />
    <Route path="modelos" element={<Modelos />} />
</Route>`,
        },
    ],
    factory: [
        {
            servicio: 'api-ml',
            titulo: 'Registro de modelos y loaders',
            que: 'build_registry decide qué servicios crear según la configuración, y cada clase de modelo trae su fábrica load(path), que lee el artefacto, valida las variables y devuelve el objeto listo o falla con StaleArtifactError.',
            archivo:
                'src/registry.py · build_registry · TrendModel.load · XGBTrendModel.load',
            codigo: `registry.register("xgboost", settings.xgb_model_path, XGBTrendModel.load)
if settings.modal_lstm_url:
    registry.register_remote("lstm-modal", settings.modal_lstm_url, default=True)`,
        },
        {
            servicio: 'backend-website',
            titulo: 'Clientes y configuración desde el entorno',
            que: 'upstream::client(timeout) fabrica los clientes HTTP hacia api-ml, Modal y data-colector con el timeout de cada caso. JwtConfig::from_env y MailConfig::from_env arman la configuración; si no hay SMTP, MailConfig devuelve None y los jobs corren igual sin mandar mails.',
            archivo:
                'src/endpoints/upstream.rs · src/auth/jwt.rs · src/mail/mod.rs',
            codigo: `pub fn client(timeout: Duration) -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(timeout)
        .build()
        .expect("reqwest client")
}`,
        },
        {
            servicio: 'data-colector',
            titulo: 'Sesión de BYMA y cliente de Yahoo',
            que: 'BymaScrapper::new() construye el cliente con su cookie jar (BYMA pide sesión). El cliente de Yahoo se arma con YfClient::builder() y un user agent de navegador. Los scrapers reciben estos objetos ya construidos.',
            archivo:
                'src/site_scrappers/byma_scrapper/byma_session.rs · src/main.rs',
            codigo: `let yfinance_client = YfClient::builder()
    .user_agent("Mozilla/5.0 (...) Chrome/91.0")
    .build()?;`,
        },
        {
            servicio: 'frontend',
            titulo: 'Instancia de axios autenticada',
            que: 'axios.create() fabrica authAxios: una instancia con interceptores que agregan el JWT a cada pedido y reaccionan a 401 (sesión vencida) y 403 (falta el perfil de riesgo). Todas las llamadas protegidas usan esa instancia.',
            archivo: 'src/api/authFetch.ts',
            codigo: `const authAxios = axios.create();
authAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = \`Bearer \${token}\`;
    return config;
});`,
        },
    ],
    micro: [
        {
            servicio: 'data-colector',
            titulo: 'Datos de mercado',
            que: 'Rust + axum + PostgreSQL propio. Scrapers en segundo plano y endpoints de históricos, tickers, sectores, tasas y series macro.',
            archivo: 'data-colector/',
            codigo: `tokio::spawn(BymaTickersPersistor::persist_available_tickers(pool));
tokio::spawn(RavaFetcher::fetch_rava_tickers(pool));
axum::serve(listener, app).await`,
        },
        {
            servicio: 'api-ml',
            titulo: 'Modelos y finanzas',
            que: 'Python + FastAPI. Sin base de datos: los artefactos viajan en el repo y los entrena GitHub Actions. Le pide datos al data-colector.',
            archivo: 'api-ml/',
            codigo: `services:
  - type: web
    name: api-ml
    runtime: docker
    autoDeploy: true`,
        },
        {
            servicio: 'backend-website',
            titulo: 'Usuarios y carteras',
            que: 'Rust + axum + PostgreSQL propio. Única puerta de entrada de la web: autenticación, carteras, cachés, alertas y mails. Llama a los otros servicios por URL configurada.',
            archivo: 'backend-website/',
            codigo: `API_ML_URL=https://api-ml-…onrender.com
DATA_COLLECTOR_URL=https://data-colector-…onrender.com
MODAL_LSTM_URL=https://…modal.run`,
        },
        {
            servicio: 'frontend',
            titulo: 'Interfaz',
            que: 'React + Vite, sitio estático. Habla con backend-website (y con data-colector solo para la ficha pública de una acción).',
            archivo: 'frontend/',
            codigo: `VITE_SERVER_API=https://backend-website-…onrender.com`,
        },
    ],
};
