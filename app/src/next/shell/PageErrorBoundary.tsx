import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

// Si una pantalla falla al dibujarse, se muestra este aviso en lugar de dejar
// toda la app en blanco. El shell lo monta con `key` = ruta, así que al
// navegar a otra pantalla vuelve a intentar solo.
export default class PageErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(
            'Error al dibujar la pantalla',
            error,
            info.componentStack,
        );
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="nx-card nx-crash" role="alert">
                <h2>Algo falló al mostrar esta pantalla</h2>
                <p className="nx-muted">
                    El resto de FinanciAr sigue funcionando. Podés reintentar o
                    volver al resumen.
                </p>
                <div className="nx-actions">
                    <button
                        type="button"
                        className="nx-btn primary"
                        onClick={() => this.setState({ error: null })}
                    >
                        Reintentar
                    </button>
                    <a className="nx-btn" href="/home">
                        Ir al resumen
                    </a>
                </div>
            </div>
        );
    }
}
