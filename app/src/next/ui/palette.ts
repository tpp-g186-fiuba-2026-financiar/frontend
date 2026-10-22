// Colores por posición (donut, barras de reparto).
export const PALETTE = [
    '#5b9dff',
    '#3ee6c4',
    '#a98bff',
    '#ffb35b',
    '#ff7eb6',
    '#7ee07e',
    '#59d0ff',
    '#f2d36b',
    '#c792ea',
    '#ff8a65',
    '#4dd0b1',
    '#9fa8da',
];

export function colorOf(i: number): string {
    return PALETTE[i % PALETTE.length];
}
