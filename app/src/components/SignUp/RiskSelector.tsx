interface RiskSelectorProps {
    value: string;
    setField: (value: string) => void;
}

function RiskSelector({ value, setField }: RiskSelectorProps) {
    return (
        <>
            <div className="mb-2">
                <label>Risk type</label>
                <select
                    className="form-select"
                    value={value}
                    onChange={(e) => setField(e.target.value)}
                >
                    <option value="" disabled>
                        Select a risk type
                    </option>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                </select>
            </div>
        </>
    );
}
export default RiskSelector;
