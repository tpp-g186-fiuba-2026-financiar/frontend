import type { IconName } from '../ui/Icon';

export interface NavItem {
    to: string;
    label: string;
    icon: IconName;
}

export interface NavGroup {
    group: string;
    items: NavItem[];
}

export const USER_NAV: NavGroup[] = [
    {
        group: 'Principal',
        items: [
            { to: '/home', label: 'Resumen', icon: 'home' },
            { to: '/cartera', label: 'Cartera', icon: 'wallet' },
            { to: '/accion', label: 'Análisis de acción', icon: 'candle' },
            { to: '/rebalanceo', label: 'Rebalanceo', icon: 'scale' },
        ],
    },
    {
        group: 'Análisis',
        items: [
            { to: '/historial', label: 'Historial de señales', icon: 'list' },
            { to: '/riesgo', label: 'Riesgo', icon: 'shield' },
            { to: '/mercado', label: 'Mercado', icon: 'globe' },
        ],
    },
    {
        group: 'Herramientas',
        items: [{ to: '/terminal', label: 'Terminal', icon: 'term' }],
    },
    {
        group: 'Cuenta',
        items: [
            { to: '/alertas', label: 'Alertas', icon: 'bell' },
            { to: '/ajustes', label: 'Ajustes', icon: 'gear' },
        ],
    },
];

export const ADMIN_NAV: NavGroup[] = [
    {
        group: 'Administración',
        items: [
            { to: '/admin/arquitectura', label: 'Arquitectura', icon: 'nodes' },
            { to: '/admin/servicios', label: 'Servicios', icon: 'db' },
            { to: '/admin/modelos', label: 'Modelos', icon: 'brain' },
            {
                to: '/admin/confiabilidad',
                label: 'Confiabilidad',
                icon: 'flask',
            },
        ],
    },
];
