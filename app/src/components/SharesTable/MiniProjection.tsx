// Linea de 2 puntos (ultimo cierre -> precio proyectado): son los unicos
// datos reales que tenemos por fila, no hay historico de precios todavia.
function MiniProjection({
    lastClose,
    predictedClose,
    signal,
}: {
    lastClose: number;
    predictedClose: number;
    signal: string | null | undefined;
}) {
    const min = Math.min(lastClose, predictedClose);
    const max = Math.max(lastClose, predictedClose);
    const span = max - min || 1;
    const y0 = 14 - ((lastClose - min) / span) * 12;
    const y1 = 14 - ((predictedClose - min) / span) * 12;
    const color = signalStrokeVar(signal);
    return (
        <svg width="34" height="18" viewBox="0 0 34 18">
            <line
                x1="1"
                y1={y0}
                x2="33"
                y2={y1}
                stroke={color}
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <circle cx="33" cy={y1} r="2" fill={color} />
        </svg>
    );
}
function signalStrokeVar(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'var(--up)';
        case 'baja':
            return 'var(--down)';
        default:
            return 'var(--neutral-sig)';
    }
}

export default MiniProjection;
