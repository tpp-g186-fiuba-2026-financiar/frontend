import authAxios from './authFetch';
import type { CompareTrendsResponse } from './userShares/getShareTrendCompareEndpoint';

const base = () => import.meta.env.VITE_SERVER_API as string;

// Modelos que el admin oculta (GET /models/hidden): se leen una vez por
// sesion y se descartan en los adaptadores, asi ninguna pantalla los muestra.
let cache: Promise<Set<string>> | null = null;

export function hiddenModels(): Promise<Set<string>> {
    cache ??= authAxios
        .get<{ hidden?: string[] }>(`${base()}/models/hidden`)
        .then((r) => new Set(r.data?.hidden ?? []))
        .catch(() => new Set<string>());
    return cache;
}

async function change(model: string, hide: boolean): Promise<string[]> {
    const url = `${base()}/admin/models/${encodeURIComponent(model)}/hidden`;
    const res = hide ? await authAxios.put(url) : await authAxios.delete(url);
    const list: string[] = res.data?.hidden ?? [];
    cache = Promise.resolve(new Set(list));
    return list;
}

export const hideModelEndpoint = (model: string) => change(model, true);
export const showModelEndpoint = (model: string) => change(model, false);

export function withoutHidden(
    data: CompareTrendsResponse,
    hidden: Set<string>,
): CompareTrendsResponse {
    if (!hidden.size || !data) return data;
    const predictions = Object.fromEntries(
        Object.entries(data.predictions ?? {}).filter(([k]) => !hidden.has(k)),
    );
    const consensus = data.consensus && {
        ...data.consensus,
        components: data.consensus.components?.filter(
            (c) => !hidden.has(c.model),
        ),
    };
    return {
        ...data,
        predictions,
        consensus,
        default_model:
            data.default_model && hidden.has(data.default_model)
                ? null
                : data.default_model,
    };
}
