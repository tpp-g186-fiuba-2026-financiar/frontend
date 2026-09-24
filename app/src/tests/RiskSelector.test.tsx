import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RiskSelector from '../components/SignUp/RiskSelector';

describe('RiskSelector', () => {
    it('renders the three risk options plus the disabled placeholder', () => {
        render(<RiskSelector value="" setField={vi.fn()} />);

        expect(
            screen.getByRole('option', { name: 'Elegí un perfil' }),
        ).toBeDisabled();
        expect(
            screen.getByRole('option', { name: 'Conservador' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Moderado' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: 'Agresivo' }),
        ).toBeInTheDocument();
    });

    it('reflects the current value in the select', () => {
        render(<RiskSelector value="moderate" setField={vi.fn()} />);
        expect(screen.getByRole('combobox')).toHaveValue('moderate');
    });

    it('calls setField with the chosen option', async () => {
        const user = userEvent.setup();
        const setField = vi.fn();
        render(<RiskSelector value="" setField={setField} />);

        await user.selectOptions(screen.getByRole('combobox'), 'aggressive');

        expect(setField).toHaveBeenCalledWith('aggressive');
    });
});
