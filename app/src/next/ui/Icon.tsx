// Íconos de trazo (24x24) usados en la barra lateral, la barra superior y
// los botones. Un solo componente para no repetir el SVG en cada lugar.

const PATHS = {
    home: 'M3 11l9-7 9 7M5 10v10h14V10',
    wallet: 'M3 6h18v14H3zM3 10h18M16.5 15h.01',
    candle: 'M7 3v4M7 17v4M17 3v6M17 15v6M5 7h4v10H5zM15 9h4v6h-4z',
    scale: 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0zM8 21h8',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
    globe: 'M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18M12 3a9 9 0 110 18 9 9 0 010-18',
    term: 'M3 4h18v16H3zM7 9l3 3-3 3M13 15h4',
    bell: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0',
    gear: 'M12 9a3 3 0 110 6 3 3 0 010-6M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    nodes: 'M3 3h6v6H3zM15 3h6v6h-6zM9 15h6v6H9zM6 9v3h12V9M12 12v3',
    db: 'M4 5c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    brain: 'M9 4a3 3 0 00-3 3v.5A3 3 0 004 10.5 3 3 0 005 15a3 3 0 003 4 2 2 0 001-.3V4.5A2 2 0 009 4zM15 4a3 3 0 013 3v.5a3 3 0 012 3 3 3 0 01-1 4.5 3 3 0 01-3 4 2 2 0 01-1-.3V4.5A2 2 0 0115 4z',
    flask: 'M9 3h6M10 3v6L4.5 18.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3M7 15h10',
    search: 'M11 4a7 7 0 110 14 7 7 0 010-14M20 20l-3.5-3.5',
    sun: 'M12 8a4 4 0 110 8 4 4 0 010-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
    book: 'M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7z',
    help: 'M12 3a9 9 0 110 18 9 9 0 010-18M9.5 9a2.5 2.5 0 015 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01',
    alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
    download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
    plus: 'M12 5v14M5 12h14',
    x: 'M6 6l12 12M18 6L6 18',
    menu: 'M4 7h16M4 12h16M4 17h16',
    arrowR: 'M5 12h14M13 6l6 6-6 6',
    logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
    trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof PATHS;

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}

export default Icon;
