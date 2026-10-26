import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import PageErrorBoundary from '../next/shell/PageErrorBoundary';

let broken = true;
function Flaky() {
    if (broken) throw new Error('boom');
    return <p>Pantalla ok</p>;
}

describe('PageErrorBoundary', () => {
    test('muestra un aviso si la pantalla falla y permite reintentar', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <PageErrorBoundary>
                <Flaky />
            </PageErrorBoundary>,
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Algo falló al mostrar esta pantalla',
        );

        broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(screen.getByText('Pantalla ok')).toBeInTheDocument();
        spy.mockRestore();
    });
});
