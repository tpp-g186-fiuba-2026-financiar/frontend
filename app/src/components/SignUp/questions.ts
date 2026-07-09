export interface Option {
    text: string;
    score: number;
}

export interface Question {
    id: number;
    text: string;
    options: Option[];
}

export const questions: Question[] = [
    {
        id: 1,
        text: 'Tu edad se encuentra dentro del rango de',
        options: [
            { text: 'Menos de 25 años.', score: 0 },
            { text: 'De 25 a 35 años.', score: 1 },
            { text: 'De 36 a 55 años.', score: 2 },
            { text: 'De 56 años o más.', score: 3 },
        ],
    },
    {
        id: 2,
        text: '¿Cuánto conocés del Mercado de Capitales (Acciones, Bonos, Obligaciones Negociables, Letras del Tesoro, Fondos Comunes de Inversión y CEDEAR)?',
        options: [
            { text: 'No poseo conocimiento.', score: 0 },
            {
                text: 'Tengo conocimientos básicos acerca de las distintas alternativas de inversión.',
                score: 1,
            },
            {
                text: 'Tengo conocimientos acerca del riesgo y rentabilidad potencial de los distintos instrumentos financieros.',
                score: 2,
            },
            {
                text: 'Poseo un profundo conocimiento acerca de las distintas alternativas de inversión (Profesional en Finanzas).',
                score: 3,
            },
        ],
    },
    {
        id: 3,
        text: '¿Qué experiencia tenés como inversionista?',
        options: [
            { text: 'Ninguna.', score: 0 },
            { text: 'Baja', score: 1 },
            { text: 'Media', score: 2 },
            { text: 'Alta', score: 3 },
        ],
    },
    {
        id: 4,
        text: '¿Aproximadamente, qué porcentaje de tus ingresos mensuales ahorrás por mes?',
        options: [
            { text: 'Menos del 5%.', score: 0 },
            { text: 'Entre el 5% y el 20%.', score: 1 },
            { text: 'Entre el 21% y el 50%.', score: 2 },
            { text: 'Más del 50%.', score: 3 },
        ],
    },
    {
        id: 5,
        text: '¿Qué porcentaje de tus ahorros estás dispuesto a destinar a las inversiones en el Mercado de Capitales?',
        options: [
            { text: 'Menos del 25%.', score: 0 },
            { text: 'Entre el 25% y el 40%.', score: 1 },
            { text: 'Entre el 41% y el 65%.', score: 2 },
            { text: 'Más del 65%.', score: 3 },
        ],
    },
    {
        id: 6,
        text: '¿Cuánto tiempo conservarías esta inversión?',
        options: [
            { text: 'Menos de 180 días.', score: 0 },
            { text: 'Entre 180 días y 1 año.', score: 1 },
            { text: 'De 1 a 2 años.', score: 2 },
            { text: 'Más de 2 años.', score: 3 },
        ],
    },
    {
        id: 7,
        text: 'En el momento de realizar una inversión, ¿cuál de las siguientes opciones preferís?',
        options: [
            {
                text: 'Preservar el dinero que se invirtió con una rentabilidad mínima.',
                score: 0,
            },
            {
                text: 'Tener una ganancia apenas superior a la de un plazo fijo, aunque esté sujeta a una variación mínima del mercado.',
                score: 1,
            },
            {
                text: 'Obtener una ganancia significativa, corriendo el riesgo de perder más de la mitad de la inversión inicial.',
                score: 3,
            },
        ],
    },
    {
        id: 8,
        text: '¿Qué porcentaje de disminución del capital de tus inversiones / ahorros estarías dispuesto a asumir? Dichas cifras se enumeran de manera taxativa, y no son definitivas al momento de asegurar una pérdida.',
        options: [
            { text: 'Entre 0% y el 5%.', score: 0 },
            { text: 'Entre el 5% y el 15%.', score: 1 },
            { text: 'Entre 15% y 30%.', score: 2 },
            { text: 'Más de 30%.', score: 3 },
        ],
    },
    {
        id: 9,
        text: 'Si tu inversión se desvaloriza un 15% a tan sólo un mes de haberla adquirido, ¿Cómo procederías?',
        options: [
            {
                text: 'Vendería la inversión para evitar una mayor pérdida.',
                score: 0,
            },
            {
                text: 'Transferiría algunos activos a inversiones de menor riesgo.',
                score: 1,
            },
            {
                text: 'Esperaría que la inversión recupere su valor inicial.',
                score: 2,
            },
            {
                text: 'Compraría una mayor cantidad aprovechando que el precio actual es menor al que había pagado inicialmente.',
                score: 3,
            },
        ],
    },
];
