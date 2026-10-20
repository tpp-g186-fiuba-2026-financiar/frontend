import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/shares/getAllSharesEndpoint', () => ({
    getAllSharesEndpoint: vi.fn(),
}));
vi.mock('../api/shares/getShareInfo', () => ({ shareInfoEndpoint: vi.fn() }));

import { getAllSharesEndpoint } from '../api/shares/getAllSharesEndpoint';
import {
    shareInfoEndpoint,
    type ShareInfoResponse,
} from '../api/shares/getShareInfo';
import type { ShareTrend } from '../api/userShares/getUserSharesTrendsEndpoint';
import StockSearch from '../components/Layout/StockSearch';
import { resetShareDirectory } from '../utils/shareDirectory';

const NAMES: Record<string, string | null> = {
    GGAL: 'Grupo Financiero Galicia',
    METR: 'Metrogas S.A.',
    TGSU2: 'Transportadora de Gas del Sur',
    PAMP: 'Pampa Energía',
    ECOG: null,
};
const CLOSES: Record<string, number[]> = {
    GGAL: [5750, 5895],
    METR: [2335, 2335],
    TGSU2: [8395, 8375],
    PAMP: [5000, 5080],
    ECOG: [],
};

function info(ticker: string): ShareInfoResponse {
    const name = NAMES[ticker];
    return {
        cached: true,
        status: 200,
        data: CLOSES[ticker].map((close, i) => ({
            close_amount: close,
            close_unadj_amount: close,
            high_amount: close,
            low_amount: close,
            open_amount: close,
            ticker,
            ts: i,
        })),
        ticker_info: (name
            ? { descripcion: '', nombre_corto: name, nombre_largo: '' }
            : null) as ShareInfoResponse['ticker_info'],
    };
}

const ggalTrend = {
    ticker: 'GGAL',
    available: true,
    signal: 'alza',
    horizon_days: 5,
} as ShareTrend;

function setup(onSelect = vi.fn()) {
    const user = userEvent.setup();
    const utils = render(
        <div>
            <input aria-label="otro campo" />
            <StockSearch
                portfolio={[{ ticker: 'GGAL', trend: ggalTrend }]}
                onSelect={onSelect}
            />
        </div>,
    );
    return { user, onSelect, ...utils };
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetShareDirectory();
    vi.mocked(getAllSharesEndpoint).mockResolvedValue({
        shares: Object.keys(NAMES).map((ticker, id) => ({
            id,
            ticker,
            predictable: true,
        })),
    });
    vi.mocked(shareInfoEndpoint).mockImplementation(async ({ share }) =>
        info(share),
    );
});

describe('StockSearch', () => {
    it('enfoca con "/" salvo que se este escribiendo en otro campo', async () => {
        const { user } = setup();
        const input = screen.getByRole('combobox');

        await user.click(screen.getByLabelText('otro campo'));
        await user.keyboard('/');
        expect(input).not.toHaveFocus();
        expect(screen.getByLabelText('otro campo')).toHaveValue('/');

        await user.click(document.body);
        await user.keyboard('/');
        expect(input).toHaveFocus();
        expect(input).toHaveValue('');
    });

    it('agrupa los resultados, resalta y muestra precio y variacion', async () => {
        const { user } = setup();
        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('aria-expanded', 'false');

        await user.click(input);
        await user.type(input, 'ga');
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(input).toHaveAttribute('aria-controls', 'stock-search-list');

        const listbox = screen.getByRole('listbox');
        await waitFor(() =>
            expect(
                within(listbox).queryByText('cargando precios…'),
            ).not.toBeInTheDocument(),
        );

        const owned = screen.getByRole('group', { name: 'En tu cartera' });
        const others = screen.getByRole('group', {
            name: 'Otras acciones del Merval',
        });
        expect(within(owned).getByText('alza · 5r')).toBeInTheDocument();
        expect(within(owned).getByText('$5.895')).toBeInTheDocument();
        expect(within(owned).getByText('+2,5%')).toBeInTheDocument();
        expect(
            within(others)
                .getAllByRole('option')
                .map((o) => o.id),
        ).toEqual(['stock-search-opt-METR', 'stock-search-opt-TGSU2']);
        expect(within(others).getByText('0,0%')).toHaveStyle({
            color: 'var(--ink-3)',
        });
        expect(within(others).getByText('−0,2%')).toHaveStyle({
            color: 'var(--down)',
        });
        const hits = listbox.querySelectorAll('mark');
        expect(Array.from(hits, (m) => m.textContent)).toEqual([
            'GA',
            'Ga',
            'ga',
            'Ga',
        ]);
        expect(input).toHaveAttribute(
            'aria-activedescendant',
            'stock-search-opt-GGAL',
        );
    });

    it('busca sin tildes y abre el detalle con Enter', async () => {
        const { user, onSelect } = setup();
        const input = screen.getByRole('combobox');
        await user.click(input);
        await user.type(input, 'energia');
        expect(
            await screen.findByRole('option', { name: /PAMP/ }),
        ).toBeInTheDocument();
        await user.keyboard('{Enter}');
        expect(onSelect).toHaveBeenCalledWith('PAMP');
        expect(input).toHaveValue('');
        expect(input).not.toHaveFocus();
    });

    it('se mueve con las flechas y cicla', async () => {
        const { user, onSelect } = setup();
        const input = screen.getByRole('combobox');
        await user.click(input);
        await user.type(input, 'ga');
        await screen.findByRole('option', { name: /TGSU2/ });

        await user.keyboard('{ArrowUp}');
        expect(input).toHaveAttribute(
            'aria-activedescendant',
            'stock-search-opt-TGSU2',
        );
        expect(screen.getByRole('option', { name: /TGSU2/ })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        await user.keyboard('{ArrowDown}{ArrowDown}');
        expect(input).toHaveAttribute(
            'aria-activedescendant',
            'stock-search-opt-METR',
        );
        await user.keyboard('{Enter}');
        expect(onSelect).toHaveBeenCalledWith('METR');
    });

    it('elige con el mouse', async () => {
        const { user, onSelect } = setup();
        const input = screen.getByRole('combobox');
        await user.click(input);
        await user.type(input, 'metro');
        const option = await screen.findByRole('option', { name: /METR/ });
        await user.hover(option);
        await user.click(option);
        expect(onSelect).toHaveBeenCalledWith('METR');
    });

    it('Esc cierra, borra con la cruz y avisa si no hay resultados', async () => {
        const onOpenChange = vi.fn();
        const user = userEvent.setup();
        render(
            <StockSearch
                portfolio={[]}
                onSelect={vi.fn()}
                onOpenChange={onOpenChange}
            />,
        );
        const input = screen.getByRole('combobox');
        await user.click(input);
        await user.type(input, 'zzz');
        expect(
            screen.getByText('No encontramos acciones para “zzz”.'),
        ).toBeInTheDocument();
        expect(onOpenChange).toHaveBeenLastCalledWith(true);

        await user.keyboard('{Escape}');
        expect(input).toHaveAttribute('aria-expanded', 'false');
        expect(onOpenChange).toHaveBeenLastCalledWith(false);
        await user.keyboard('{Escape}');
        expect(input).not.toHaveFocus();

        await user.click(input);
        expect(input).toHaveAttribute('aria-expanded', 'true');
        await user.click(
            screen.getByRole('button', { name: 'Borrar búsqueda' }),
        );
        expect(input).toHaveValue('');
        expect(input).toHaveFocus();
        expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('sin precios muestra un guion y sin la lista busca en la cartera', async () => {
        vi.mocked(getAllSharesEndpoint).mockRejectedValue(new Error('x'));
        vi.mocked(shareInfoEndpoint).mockRejectedValue(new Error('x'));
        const { user } = setup();
        const input = screen.getByRole('combobox');
        await user.click(input);
        await user.type(input, 'gg');
        const option = await screen.findByRole('option', { name: /GGAL/ });
        await waitFor(() =>
            expect(within(option).getByText('—')).toBeInTheDocument(),
        );
    });

    it('usa los nombres guardados antes de que lleguen los precios', async () => {
        localStorage.setItem(
            'shareNames',
            JSON.stringify({ TGSU2: 'Transportadora de Gas del Sur' }),
        );
        vi.mocked(shareInfoEndpoint).mockImplementation(
            () => new Promise(() => {}),
        );
        const { user } = setup();
        const input = screen.getByRole('combobox');
        await user.click(input);
        await user.type(input, 'sur');
        expect(
            await screen.findByRole('option', { name: /TGSU2/ }),
        ).toBeInTheDocument();
        expect(screen.getByText('cargando precios…')).toBeInTheDocument();
    });
});
