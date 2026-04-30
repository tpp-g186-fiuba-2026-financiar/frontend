import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

test('shows message from API', async () => {
    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
        expect(
            screen.getByText('Hello from Financiar backend!'),
        ).toBeInTheDocument();
    });
});
