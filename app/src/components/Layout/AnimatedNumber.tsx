import { useCountUp } from '../../hooks/useCountUp';

interface AnimatedNumberProps {
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

// Número que "corre" hasta su valor. El valor final siempre queda en el
// atributo para lectores de pantalla y tests (el texto visible va animándose).
function AnimatedNumber({
    value,
    decimals = 0,
    prefix = '',
    suffix = '',
    className,
}: AnimatedNumberProps) {
    const shown = useCountUp(value);
    const format = (n: number) =>
        n.toLocaleString('es-AR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    return (
        <span
            className={className}
            aria-label={`${prefix}${format(value)}${suffix}`}
        >
            <span aria-hidden="true">
                {prefix}
                {format(shown)}
                {suffix}
            </span>
        </span>
    );
}

export default AnimatedNumber;
