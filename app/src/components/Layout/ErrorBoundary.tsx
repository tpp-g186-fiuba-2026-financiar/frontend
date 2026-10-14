import { Component, type ErrorInfo, type ReactNode } from 'react';
import logger from '../../utils/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

// Si un componente tira una excepcion al renderizar, React desmonta todo y
// queda la pantalla en blanco. Esto la loguea y muestra un aviso con opcion
// de recargar.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        logger.error('Error de render', {
            mensaje: error.message,
            nombre: error.name,
            stack: error.stack,
            componentStack: info.componentStack,
        });
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="container py-5" role="alert">
                <h1 className="mb-3" style={{ fontSize: '28px' }}>
                    Algo salió mal
                </h1>
                <p className="mb-4" style={{ color: 'var(--ink-3)' }}>
                    Ocurrió un error inesperado al mostrar esta pantalla.
                    Recargá la página para seguir.
                </p>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    Recargar
                </button>
            </div>
        );
    }
}

export default ErrorBoundary;
