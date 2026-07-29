interface RiskSelectorProps {
    value: string;
    setField: (value: string) => void;
}

function RiskSelector({ value, setField }: RiskSelectorProps) {
    return (
        <>
            <div className="mb-2">
                <label>Perfil de riesgo</label>
                <select
                    className="form-select"
                    value={value}
                    onChange={(e) => setField(e.target.value)}
                >
                    <option value="" disabled>
                        Elegí un perfil
                    </option>
                    <option value="conservative">Conservador</option>
                    <option value="moderate">Moderado</option>
                    <option value="aggressive">Agresivo</option>
                </select>
            </div>
        </>
    );
}
export default RiskSelector;
