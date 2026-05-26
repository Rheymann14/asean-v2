export const ASEAN_COUNTRY_CODES = new Set([
    'BRN',
    'KHM',
    'IDN',
    'LAO',
    'MYS',
    'MMR',
    'PHL',
    'SGP',
    'THA',
    'TLS',
    'VNM',
]);

const ASEAN_COUNTRY_NAMES = new Set([
    'brunei',
    'cambodia',
    'indonesia',
    'laos',
    'malaysia',
    'myanmar',
    'philippines',
    'singapore',
    'thailand',
    'timor-leste',
    'timor leste',
    'vietnam',
]);

function normalizeCountryName(name: string | null | undefined): string {
    return String(name ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

export function isAseanCountry(country: {
    code?: string | null;
    name?: string | null;
}): boolean {
    const code = String(country.code ?? '')
        .trim()
        .toUpperCase();
    if (ASEAN_COUNTRY_CODES.has(code)) return true;

    return ASEAN_COUNTRY_NAMES.has(normalizeCountryName(country.name));
}

export function splitCountriesByAsean<
    T extends { code?: string | null; name?: string | null },
>(countries: T[]): { asean: T[]; nonAsean: T[] } {
    const asean: T[] = [];
    const nonAsean: T[] = [];

    countries.forEach((country) => {
        if (isAseanCountry(country)) {
            asean.push(country);
            return;
        }

        nonAsean.push(country);
    });

    return { asean, nonAsean };
}
