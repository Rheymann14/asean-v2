import * as React from 'react';
import PublicLayout from '@/layouts/public-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    MapPin,
    ExternalLink,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    X,
    ImageOff,
} from 'lucide-react';

type ProgrammeRow = {
    id: number;
    title: string;
    starts_at?: string | null;
    ends_at?: string | null;
};

type VenueRow = {
    id: number;
    programme_id: number | null;
    name: string;
    address: string;
    google_maps_url: string | null;
    embed_url: string | null;
    programme?: ProgrammeRow | null;
};

type EventVenue = {
    id: string;
    label: string;
    dateLabel?: string;
    venueName: string;
    address: string;
    googleMapsLink?: string;
    embedUrl?: string | null;
    tip?: string;
};

type VenueSectionItem = {
    id: number;
    title: string;
    description: string | null;
    link: string | null;
    image_path: string;
};

type VenueSection = {
    title: string;
    items: VenueSectionItem[];
};

type PageProps = {
    venues?: VenueRow[];
    section?: VenueSection | null;
};

function formatDateRange(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt) return null;
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;

    if (Number.isNaN(start.getTime())) return null;
    const date = new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit' }).format(start);
    const time = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(start);

    if (!end || Number.isNaN(end.getTime())) return `${date} · ${time}`;
    const endTime = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(end);
    return `${date} · ${time}–${endTime}`;
}

function MapEmbed({
    embedUrl,
    googleMapsLink,
}: {
    embedUrl?: string | null;
    googleMapsLink?: string | null;
}) {
    const [loaded, setLoaded] = React.useState(false);

    if (!embedUrl) {
        return (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
                <div className="space-y-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Map preview unavailable</p>
                    <p>No pinned map location.</p>
                    {googleMapsLink ? (
                        <Button asChild className="mt-2 h-9 rounded-2xl bg-[#0033A0] text-white hover:opacity-95">
                            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer">
                                Open in Google Maps
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="relative aspect-[16/9] w-full">
            {!loaded && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-sm dark:bg-slate-950/50">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200" />
                        <p className="text-sm text-slate-700 dark:text-slate-200">Loading map…</p>
                    </div>
                </div>
            )}

            <iframe
                title="Venue location map"
                src={embedUrl}
                className="h-full w-full"
                loading="lazy"
                allowFullScreen
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
}

function resolveSectionImage(imagePath?: string | null) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('/')) return imagePath;
    return `/section/${imagePath}`;
}

function EventVenuePanel({ event }: { event: EventVenue }) {
    return (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-12">
            <Card className="overflow-hidden rounded-2xl border-slate-200/70 bg-white shadow-[0_12px_40px_-25px_rgba(2,6,23,0.35)] dark:border-white/10 dark:bg-slate-900 lg:col-span-8">
                <MapEmbed embedUrl={event.embedUrl} googleMapsLink={event.googleMapsLink} />
            </Card>

            <Card className="rounded-2xl border-slate-200/70 bg-white/70 p-6 shadow-[0_12px_40px_-25px_rgba(2,6,23,0.35)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40 lg:col-span-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0033A0]/10 text-[#0033A0] dark:bg-[#7aa2ff]/15 dark:text-[#7aa2ff]">
                        <MapPin className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{event.venueName}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{event.address}</p>

                        {event.dateLabel && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
                                <CalendarDays className="h-4 w-4" />
                                {event.dateLabel}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid gap-3">
                    {event.googleMapsLink ? (
                        <Button
                            asChild
                            className="h-11 rounded-2xl bg-gradient-to-r from-[#0033A0] to-[#1e3c73] text-white hover:opacity-95"
                        >
                            <a href={event.googleMapsLink} target="_blank" rel="noopener noreferrer">
                                Open in Google Maps
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled
                            className="h-11 rounded-2xl bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        >
                            Google Maps link unavailable
                        </Button>
                    )}
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <p className="font-medium text-amber-950 dark:text-amber-50">Tip</p>
                    <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                        {event.tip ?? 'Tap “Open in Google Maps” for the exact pin and navigation directions.'}
                    </p>
                </div>
            </Card>
        </div>
    );
}

/** ---- Truncate + toggle helper ---- */
const CLAMP_CLASS: Record<number, string> = {
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
};

function TruncateWithToggle({
    text,
    lines = 3,
    expanded,
    onToggle,
    threshold = 140,
    className = '',
}: {
    text: string;
    lines?: 2 | 3 | 4;
    expanded: boolean;
    onToggle: () => void;
    threshold?: number;
    className?: string;
}) {
    const shouldToggle = text.trim().length > threshold;
    const clamp = expanded ? '' : (CLAMP_CLASS[lines] ?? 'line-clamp-3');

    return (
        <div className="space-y-2">
            <div className={[clamp, 'break-words [overflow-wrap:anywhere]', className].join(' ')}>
                {text}
            </div>

            {shouldToggle ? (
                <button
                    type="button"
                    onClick={onToggle}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#0033A0] hover:underline"
                >
                    {expanded ? (
                        <>
                            Show less <ChevronUp className="h-4 w-4" />
                        </>
                    ) : (
                        <>
                            Show more <ChevronDown className="h-4 w-4" />
                        </>
                    )}
                </button>
            ) : null}
        </div>
    );
}

function NoImageFallback({ label = 'No image uploaded' }: { label?: string }) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
                <ImageOff className="h-5 w-5" />
            </div>
            <p className="text-sm">{label}</p>
        </div>
    );
}

export default function Venue({ venues = [], section }: PageProps) {
    const eventVenues = React.useMemo(() => {
        return venues.map((venue) => ({
            id: String(venue.id),
            label: venue.programme?.title ?? venue.name,
            dateLabel:
                formatDateRange(venue.programme?.starts_at ?? null, venue.programme?.ends_at ?? null) ?? undefined,
            venueName: venue.name,
            address: venue.address,
            googleMapsLink: venue.google_maps_url ?? undefined,
            embedUrl: venue.embed_url ?? undefined,
            tip: 'Tap “Open in Google Maps” for the exact pin and navigation directions.',
        }));
    }, [venues]);

    const sectionTitle = section?.title?.trim() || 'Section Title';
    const sectionItems = section?.items ?? [];

    const [activeItem, setActiveItem] = React.useState<VenueSectionItem | null>(null);

    const [brokenImages, setBrokenImages] = React.useState<Record<number, boolean>>({});

    // ✅ toggles for long title/desc inside dialog (reset per item)
    const [titleExpanded, setTitleExpanded] = React.useState(false);
    const [descExpanded, setDescExpanded] = React.useState(false);

    // ✅ image error handling (broken URL, etc.)
    const [imgError, setImgError] = React.useState(false);

    const activeImageSrc = activeItem ? resolveSectionImage(activeItem.image_path) : null;
    const activeReadMoreLink = activeItem?.link?.trim() || null;

    React.useEffect(() => {
        setTitleExpanded(false);
        setDescExpanded(false);
    }, [activeItem?.id]);

    React.useEffect(() => {
        setImgError(false);
    }, [activeImageSrc]);

    const firstVenueId = eventVenues[0]?.id ?? '';
    const [activeVenueId, setActiveVenueId] = React.useState(firstVenueId);

    // keep active tab valid if venues change
    React.useEffect(() => {
        if (!firstVenueId) return;

        const stillExists = eventVenues.some((v) => v.id === activeVenueId);
        if (!stillExists) setActiveVenueId(firstVenueId);
    }, [firstVenueId, eventVenues, activeVenueId]);


    return (
        <>
            <Head title="Venue" />

            <PublicLayout navActive="/venue">
                <section className="relative isolate mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl text-center">
                        <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                            <span className="relative inline-block">
                                <span className="relative z-10 text-[#0033A0]">Venue</span>
                                <span className="pointer-events-none absolute inset-x-0 bottom-1 -z-0 h-2 rounded-full bg-[#0033A0]/15 blur-[1px]" />
                            </span>{' '}
                        </h2>

                        <div className="mx-auto mt-6 flex items-center justify-center gap-3">
                            <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
                            <span className="h-2 w-2 rounded-full bg-[#FCD116] shadow-[0_0_0_6px_rgba(252,209,22,0.12)]" />
                            <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
                        </div>
                    </div>

                    {/* ✅ Event Tabs */}
                    <div className="mx-auto mt-10 max-w-6xl">
                        {eventVenues.length === 0 ? (
                            <Card className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-8 text-center shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/55 dark:border-white/10 dark:bg-slate-900/35">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.12),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(56,189,248,0.10),transparent_60%)]"
                                />
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-slate-200/40 blur-2xl dark:bg-white/10"
                                />

                                <div className="relative mx-auto flex max-w-sm flex-col items-center">
                                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                        <MapPin className="h-5 w-5" />
                                    </div>

                                    <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                                        No venues yet
                                    </p>

                                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                        Please check back soon for venue updates.
                                    </p>

                                    <div className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />
                                </div>
                            </Card>
                        ) : (
                            <Tabs value={activeVenueId} onValueChange={setActiveVenueId} className="w-full">
                                <div className="flex items-center justify-center">
                                    <div className="relative w-full max-w-6xl">
                                        {/* subtle edge fades (mobile) */}
                                        <div
                                            aria-hidden
                                            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white/90 to-transparent dark:from-slate-950/70 md:hidden"
                                        />
                                        <div
                                            aria-hidden
                                            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white/90 to-transparent dark:from-slate-950/70 md:hidden"
                                        />

                                        <TabsList
                                            className={[
                                                'h-auto w-full items-center justify-start gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-2',
                                                'shadow-[0_10px_30px_-28px_rgba(2,6,23,0.25)] backdrop-blur-md',
                                                // ✅ mobile horizontal scroll
                                                'overflow-x-auto overflow-y-hidden scroll-smooth',
                                                'snap-x snap-mandatory',
                                                '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                                                'dark:border-white/10 dark:bg-slate-900/40',
                                            ].join(' ')}
                                        >
                                            {eventVenues.map((ev) => (
                                                <TabsTrigger
                                                    key={ev.id}
                                                    value={ev.id}
                                                    title={ev.label}
                                                    className={[
                                                        // ✅ fixed height prevents “circle balloon” tabs
                                                        'snap-start shrink-0',
                                                        'h-12 rounded-xl px-3',
                                                        // ✅ readable width on mobile, auto on desktop
                                                        'w-[11.5rem] sm:w-auto sm:max-w-[18rem]',
                                                        // ✅ allow 2-line titles (no crazy wrapping)
                                                        'whitespace-normal text-center',
                                                        'text-[11px] font-semibold leading-tight tracking-wide',
                                                        // ✅ states
                                                        'data-[state=inactive]:text-slate-700 data-[state=inactive]:hover:bg-slate-100/80',
                                                        'data-[state=active]:bg-[#0033A0] data-[state=active]:text-white',
                                                        'dark:data-[state=inactive]:text-slate-200 dark:data-[state=inactive]:hover:bg-white/10',
                                                        // ✅ focus
                                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0033A0]/35 focus-visible:ring-offset-2',
                                                        'ring-offset-white dark:ring-offset-slate-950',
                                                    ].join(' ')}
                                                >
                                                    <span
                                                        className={[
                                                            'block min-w-0',
                                                            // ✅ mobile: single line with ellipsis
                                                            'truncate',
                                                            // ✅ sm+: allow up to 2 lines (no plugin needed)
                                                            'sm:whitespace-normal sm:overflow-hidden',
                                                            'sm:[display:-webkit-box] sm:[-webkit-box-orient:vertical] sm:[-webkit-line-clamp:2]',
                                                        ].join(' ')}
                                                    >
                                                        {ev.label}
                                                    </span>

                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    {eventVenues.map((ev) => (
                                        <TabsContent key={ev.id} value={ev.id} className="m-0 outline-none">
                                            <div className="animate-in fade-in-0 duration-300">
                                                <EventVenuePanel event={ev} />
                                            </div>
                                        </TabsContent>
                                    ))}
                                </div>
                            </Tabs>

                        )}
                    </div>

                    {/* Section */}
                    <div className="mx-auto mt-12 max-w-5xl text-center mt-12">
                        <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                            <span className="relative inline-block">
                                <span className="relative z-10 text-[#0033A0]">{sectionTitle}</span>
                                <span className="pointer-events-none absolute inset-x-0 bottom-1 -z-0 h-2 rounded-full bg-[#0033A0]/15 blur-[1px]" />
                            </span>{' '}
                        </h2>

                        <div className="mx-auto mt-6 flex items-center justify-center gap-3">
                            <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
                            <span className="h-2 w-2 rounded-full bg-[#FCD116] shadow-[0_0_0_6px_rgba(252,209,22,0.12)]" />
                            <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
                        </div>

                        <div className="mx-auto mt-10 max-w-6xl">
                            {sectionItems.length === 0 ? (
                                <Card className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
                                    No section highlights yet.
                                </Card>
                            ) : (
                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {sectionItems.map((item) => {
                                        const imageSrc = resolveSectionImage(item.image_path);
                                        return (
                                            <div
                                                key={item.id}
                                                className={[
                                                    'group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white',
                                                    'shadow-[0_18px_55px_-45px_rgba(2,6,23,0.35)]',
                                                    'transition will-change-transform hover:-translate-y-1 hover:shadow-[0_30px_70px_-45px_rgba(2,6,23,0.55)]',
                                                ].join(' ')}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveItem(item)}
                                                    className="block w-full text-left"
                                                    aria-label={`View details for ${item.title}`}
                                                >
                                                    <div className="relative aspect-[4/3]">
                                                        {imageSrc && !brokenImages[item.id] ? (
                                                            <img
                                                                src={imageSrc}
                                                                alt={item.title}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                                                                draggable={false}
                                                                onError={() => setBrokenImages((prev) => ({ ...prev, [item.id]: true }))}
                                                            />
                                                        ) : (
                                                            <div className="grid h-full w-full place-items-center bg-slate-100 dark:bg-slate-800/40">
                                                                <NoImageFallback />
                                                            </div>
                                                        )}


                                                        <div
                                                            aria-hidden
                                                            className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent"
                                                        />

                                                        <div className="absolute inset-x-0 bottom-0 p-5">
                                                            <div className="min-w-0 text-left">
                                                                <h3
                                                                    className={[
                                                                        'line-clamp-2 break-words [overflow-wrap:anywhere] text-lg font-semibold text-white drop-shadow-sm',
                                                                        // ✅ always visible on desktop
                                                                        'md:translate-y-0 md:opacity-100 md:transition md:duration-300',
                                                                    ].join(' ')}
                                                                >
                                                                    {item.title}
                                                                </h3>

                                                                {item.description ? (
                                                                    <p
                                                                        className={[
                                                                            'mt-1 line-clamp-2 break-words [overflow-wrap:anywhere] text-sm text-white/85',
                                                                            // ✅ always visible on desktop
                                                                            'md:translate-y-0 md:opacity-100 md:transition md:duration-300 md:delay-75',
                                                                        ].join(' ')}
                                                                    >
                                                                        {item.description}
                                                                    </p>
                                                                ) : null}

                                                            </div>
                                                        </div>

                                                        <div
                                                            aria-hidden
                                                            className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10"
                                                        />
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </PublicLayout>

            {/* ✅ Section details dialog — desktop stays old, mobile gets sticky actions */}
            <Dialog open={!!activeItem} onOpenChange={(open) => (!open ? setActiveItem(null) : null)}>
                <DialogContent
                    className={[
                        // ✅ width
                        'w-[calc(100%-1.5rem)] sm:max-w-4xl',
                        // ✅ height & overflow
                        'max-h-[90vh] overflow-hidden',
                        // ✅ polish
                        'rounded-2xl p-0',
                    ].join(' ')}
                >
                    {/* Outer shell */}
                    <div className="flex max-h-[90vh] flex-col">
                        {/* Header (fixed) */}
                        <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Section details</p>
                        </div>

                        {/* Body:
               - Mobile: whole body scrolls (so actions stay visible)
               - Desktop: body doesn't scroll, only right panel scrolls (old behavior)
            */}
                        <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 md:h-full">
                                {/* Left: image */}
                                <div className="bg-slate-50 p-4 sm:p-6 dark:bg-slate-950/30">
                                    <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                                        <div className="relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-3 dark:bg-slate-800/40 md:max-h-[60vh]">
                                            {!activeImageSrc || imgError ? (
                                                <NoImageFallback
                                                    label={!activeImageSrc ? 'No image uploaded' : 'Image failed to load'}
                                                />
                                            ) : (
                                                <img
                                                    src={activeImageSrc}
                                                    alt={activeItem?.title ?? 'Section image'}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="max-h-[56vh] w-full object-contain"
                                                    draggable={false}
                                                    onError={() => setImgError(true)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* ✅ Desktop: keep old close button here */}
                                    <div className="mt-4 hidden justify-end md:flex">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 rounded-xl"
                                            onClick={() => setActiveItem(null)}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>

                                {/* Right: content
                       - Desktop: this panel scrolls (old)
                       - Mobile: it flows naturally; whole body scrolls instead
                    */}
                                <div className="relative p-5 sm:p-6 md:max-h-[calc(90vh-52px)] md:overflow-y-auto md:pb-28">
                                    <DialogHeader className="space-y-3 text-left">
                                        <DialogTitle className="min-w-0 text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                                            {activeItem?.title ? (
                                                <TruncateWithToggle
                                                    text={activeItem.title}
                                                    lines={2}
                                                    expanded={titleExpanded}
                                                    onToggle={() => setTitleExpanded((v) => !v)}
                                                    threshold={90}
                                                    className="text-slate-900 dark:text-slate-50"
                                                />
                                            ) : null}
                                        </DialogTitle>

                                        {activeItem?.description ? (
                                            <DialogDescription className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                                                <TruncateWithToggle
                                                    text={activeItem.description}
                                                    lines={4}
                                                    expanded={descExpanded}
                                                    onToggle={() => setDescExpanded((v) => !v)}
                                                    threshold={160}
                                                    className="text-slate-600 dark:text-slate-300"
                                                />
                                            </DialogDescription>
                                        ) : (
                                            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                                                No description provided.
                                            </DialogDescription>
                                        )}
                                    </DialogHeader>

                                    {/* ✅ Desktop: keep old "Read more" floating bottom-right */}
                                    {activeReadMoreLink ? (
                                        <div className="hidden md:block">
                                            <div className="absolute bottom-6 right-6">
                                                <Button
                                                    asChild
                                                    className="h-9 rounded-xl bg-[#0033A0] px-3 text-xs font-semibold text-white hover:opacity-95"
                                                >
                                                    <a href={activeReadMoreLink} target="_blank" rel="noopener noreferrer">
                                                        Read more
                                                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* ✅ Mobile-only sticky action bar (always visible) */}
                        <div className="md:hidden border-t border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/75 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
                            {activeReadMoreLink ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        asChild
                                        className="h-11 rounded-2xl bg-[#0033A0] text-sm font-semibold text-white hover:opacity-95"
                                    >
                                        <a href={activeReadMoreLink} target="_blank" rel="noopener noreferrer">
                                            Read more
                                            <ExternalLink className="ml-2 h-4 w-4" />
                                        </a>
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 rounded-2xl"
                                        onClick={() => setActiveItem(null)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    className="h-11 w-full rounded-2xl bg-[#0033A0] text-white hover:opacity-95"
                                    onClick={() => setActiveItem(null)}
                                >
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


        </>
    );
}
