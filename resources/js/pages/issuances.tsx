import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PublicLayout from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    Calendar,
    Download,
    ExternalLink,
    FileText,
    QrCode,
    Search,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as React from 'react';

type Issuance = {
    title: string;
    issued_at: string; // YYYY-MM-DD
    href: string; // /downloadables/file.pdf
    is_active?: boolean;
};

type PageProps = {
    issuances?: Issuance[];
};

function formatDate(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(d);
}

function isNew(dateStr: string, days = 30) {
    const d = new Date(`${dateStr}T00:00:00`).getTime();
    const diffDays = (Date.now() - d) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
}

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
    const ref = React.useRef<T | null>(null);
    const [inView, setInView] = React.useState(false);

    React.useEffect(() => {
        if (!ref.current) return;

        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setInView(true);
        }, options);

        obs.observe(ref.current);
        return () => obs.disconnect();
    }, [options]);

    return { ref, inView };
}

function PdfThumb({ href, title }: { href: string; title: string }) {
    const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '220px' });

    return (
        <div
            ref={ref}
            className={cn(
                'relative aspect-[3/4] w-full overflow-hidden rounded-2xl',
                'bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200',
                'shadow-[0_18px_50px_-40px_rgba(2,6,23,0.35)]',
            )}
            aria-hidden
        >
            {/* paper shine */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,rgba(255,255,255,0.9),transparent_55%)]" />

            {inView ? (
                <iframe
                    title={`${title} preview`}
                    src={`${href}#page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0`}
                    className={cn(
                        'pointer-events-none absolute inset-0 bg-white',
                        'h-[140%] w-[140%] origin-top-left scale-[0.72]',
                    )}
                    loading="lazy"
                />
            ) : (
                <div className="grid h-full w-full place-items-center">
                    <FileText className="h-7 w-7 text-slate-400" />
                </div>
            )}

            {/* ✅ Hide scrollbar area on the right (soft blend) */}
            <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-3 bg-gradient-to-l from-slate-50 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </div>
    );
}

function IssuanceTile({ item }: { item: Issuance }) {
    return (
        <div className="group">
            <div className="relative">
                <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                        'block rounded-2xl focus-visible:ring-2 focus-visible:ring-[#0033A0]/30 focus-visible:outline-none',
                    )}
                >
                    <PdfThumb href={item.href} title={item.title} />
                </a>

                {/* Actions overlay
                    - Mobile: always visible (no hover on touch)
                    - Desktop: show on hover/focus
                 */}
                <div
                    className={cn(
                        'absolute inset-0 rounded-2xl transition-opacity',
                        'opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
                    )}
                >
                    {/* gradient only for sm+ so the preview stays clean on mobile */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl sm:bg-gradient-to-t sm:from-slate-950/40 sm:via-slate-950/10 sm:to-transparent" />

                    {/* Bottom action bar */}
                    <div className="absolute right-3 bottom-3 left-3">
                        <div
                            className={cn(
                                'pointer-events-auto flex gap-2',
                                'flex-col sm:flex-row sm:items-center sm:justify-between',
                            )}
                        >
                            <Button
                                asChild
                                size="sm"
                                className="h-9 w-full rounded-full sm:w-auto"
                            >
                                <a
                                    href={item.href}
                                    download
                                    aria-label={`Download ${item.title}`}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </a>
                            </Button>

                            <Button
                                asChild
                                size="sm"
                                variant="secondary"
                                className="h-9 w-full rounded-full sm:w-auto"
                            >
                                <a
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open ${item.title}`}
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meta */}
            <div className="mt-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    {isNew(item.issued_at) ? (
                        <Badge className="rounded-full bg-[#FCD116] text-slate-900 hover:bg-[#FCD116]">
                            New
                        </Badge>
                    ) : null}

                    <span className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(item.issued_at)}
                    </span>
                </div>

                <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {item.title}
                </p>
            </div>
        </div>
    );
}

export default function Issuances(props: PageProps) {
    const [q, setQ] = React.useState('');
    const [kitQr, setKitQr] = React.useState<string | null>(null);
    const issuances = props.issuances ?? [];
    const activeIssuances = React.useMemo(
        () => issuances.filter((item) => item.is_active !== false),
        [issuances],
    );

    const filtered = React.useMemo(() => {
        const query = q.trim().toLowerCase();
        if (!query) return activeIssuances;

        return activeIssuances.filter((x) => {
            const hay = `${x.title} ${x.issued_at}`.toLowerCase();
            return hay.includes(query);
        });
    }, [q, activeIssuances]);

    React.useEffect(() => {
        const url = `${window.location.origin}/event-kit`;

        QRCode.toDataURL(url, {
            width: 200,
            margin: 1,
            color: {
                dark: '#0033A0',
                light: '#ffffff',
            },
        })
            .then((dataUrl) => setKitQr(dataUrl))
            .catch(() => setKitQr(null));
    }, []);

    return (
        <>
            <Head title="Resources" />

            <PublicLayout navActive="/issuances">
                <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    {/* soft background */}
                    {/* <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
                    <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#0033A0]/10 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -right-24 top-24 -z-10 h-72 w-72 rounded-full bg-[#FCD116]/15 blur-3xl" /> */}
                    <div className="mx-auto max-w-5xl text-center">
                        <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl">
                            <span className="relative inline-block">
                                <span className="relative z-10 text-[#0033A0]">
                                    Resources
                                </span>
                                <span className="pointer-events-none absolute inset-x-0 bottom-1 -z-0 h-2 rounded-full bg-[#0033A0]/15 blur-[1px]" />
                            </span>
                        </h2>

                        <div className="mx-auto mt-6 flex items-center justify-center gap-3">
                            <span className="h-px w-12 bg-slate-200" />
                            <span className="h-2 w-2 rounded-full bg-[#FCD116] shadow-[0_0_0_6px_rgba(252,209,22,0.12)]" />
                            <span className="h-px w-12 bg-slate-200" />
                        </div>
                    </div>

                    <div className="mx-auto mt-6 w-full max-w-3xl px-4 sm:px-0">
                        <div className="rounded-xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
                            <div className="p-3 sm:p-4">
                                <div className="grid items-center gap-3 sm:grid-cols-[auto_110px] sm:gap-4">
                                    <div className="flex min-w-0 items-start gap-2.5 sm:max-w-xl">
                                        <div className="mt-0.5 shrink-0 rounded-lg bg-[#0033A0]/10 p-1.5 text-[#0033A0]">
                                            <QrCode className="h-4 w-4" />
                                        </div>

                                        <div className="min-w-0">
                                            <h2 className="text-sm font-semibold text-slate-900">
                                                EVENT KIT & CERTIFICATES
                                            </h2>

                                            <p className="mt-1 text-xs leading-snug text-slate-600">
                                                Scan the QR or click the link to access materials and claim
                                                certificates.
                                            </p>

                                            <div className="mt-2.5">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className="h-8 bg-[#0033A0] px-3 text-white hover:bg-[#0033A0]/90"
                                                >
                                                    <a href="/event-kit" className="inline-flex items-center">
                                                        Access Event Kit
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center sm:justify-end">
                                        {kitQr ? (
                                            <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                                                <img
                                                    src={kitQr}
                                                    alt="Event kit QR code"
                                                    className="h-24 w-24 rounded-lg"
                                                    loading="lazy"
                                                    draggable={false}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-500">QR unavailable</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Search */}
                    <div className="mx-auto mt-10 max-w-5xl">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search issuance (title, category, date)…"
                                className="h-12 rounded-2xl pl-11"
                            />
                        </div>
                        <div className="mt-3 text-sm text-slate-600">
                            Showing{' '}
                            <span className="font-semibold text-slate-900">
                                {filtered.length}
                            </span>{' '}
                            item
                            {filtered.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    {/* Grid thumbnails */}
                    <div className="mx-auto mt-8 max-w-6xl">
                        {filtered.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                <FileText className="mx-auto h-7 w-7 text-slate-400" />
                                <p className="text-sm font-medium text-slate-700">
                                    No issuances found.
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Try another keyword.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filtered.map((item) => (
                                    <IssuanceTile
                                        key={`${item.href}-${item.issued_at}`}
                                        item={item}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </PublicLayout>
        </>
    );
}
