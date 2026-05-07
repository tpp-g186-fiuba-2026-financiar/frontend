import { render, screen, waitFor } from '@testing-library/react';
import App from '../components/Pages/App';
import { MemoryRouter } from 'react-router-dom';

test('shows message from API', async () => {
    render(
        <MemoryRouter>
            <App />
        </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
        expect(
            screen.getByText('Hello from Financiar backend!'),
        ).toBeInTheDocument();
        expect(screen.getByText('Sign up')).toBeInTheDocument();
    });
});
