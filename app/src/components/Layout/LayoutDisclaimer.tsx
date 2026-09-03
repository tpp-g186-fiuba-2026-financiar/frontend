function LayoutDisclaimer() {
    return (
        <div
            role="alert"
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: '#fff8e1',
                border: '1px solid #f0c14b',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                lineHeight: 1.45,
                color: '#5c4a06',
            }}
        >
            <span aria-hidden="true" style={{ fontSize: '16px' }}>
                ⚠️
            </span>
            <span>
                <b>Aviso legal:</b> FinanciAr es un proyecto académico de la
                Facultad de Ingeniería de la UBA (FIUBA). Las señales de esta
                plataforma son generadas por modelos de machine learning con
                fines demostrativos y educativos. No constituyen asesoramiento
                financiero, recomendación de inversión ni oferta de ningún tipo.
                No estamos capacitados ni habilitados para brindar asesoramiento
                financiero. Cualquier decisión de inversión es responsabilidad
                exclusiva del usuario.
            </span>
        </div>
    );
}

export default LayoutDisclaimer;
