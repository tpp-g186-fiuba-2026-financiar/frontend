import { fireEvent, render, screen } from '@testing-library/react';
import App from '../components/Pages/App';
import { MemoryRouter } from 'react-router-dom';

test('la portada se ve enseguida y muestra el estado del servidor', async () => {
    render(
        <MemoryRouter>
            <App />
        </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Señales de tendencia/ })).toBeInTheDocument();
    expect(screen.getByText('Conectando…')).toBeInTheDocument();
    expect(await screen.findByText('Hello from Financiar backend!')).toBeInTheDocument();
    expect(screen.getByText('Cómo funciona', { selector: 'a' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tema claro u oscuro' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Ya tengo cuenta' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('abre el registro desde la portada', () => {
    render(
        <MemoryRouter>
            <App />
        </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta gratis/ }));
    expect(screen.getByText(/Pregunta 1 de/)).toBeInTheDocument();
});
