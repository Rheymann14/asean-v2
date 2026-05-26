import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PublicLayout from '@/layouts/public-layout';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    CircleCheck,
    CircleX,
    ImageOff,
    Search,
    Sparkles,
    Timer,
    ZoomIn,
} from 'lucide-react';
import * as React from 'react';

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type ProgrammeRow = {
    id: number;
    title: string;
    description: string;
    starts_at: string | null;
    ends_at: string | null;
    image_url: string | null;
    pdf_url: string | null;
    is_active: boolean;
};

type PageProps = {
    programmes?: ProgrammeRow[];
};

type FlexHoverItem = {
    id: number;
    title: string;
    body: string;
    image: string | null;
    tint: string;

    startsAt: string;
    endsAt?: string;

    cta?: { label: string; href: string };
};

const TINTS = [
    'bg-gradient-to-br from-[#dbeafe] via-white to-[#fef9c3]',
    'bg-gradient-to-br from-[#fce7f3] via-white to-[#e0e7ff]',
    'bg-gradient-to-br from-[#ffedd5] via-white to-[#e2e8f0]',
];

function resolveImageUrl(imageUrl?: string | null) {
    if (!imageUrl) return null; // ✅ no image -> null
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/'))
        return imageUrl;
    return `/event-images/${imageUrl}`;
}

function resolvePdfUrl(pdfUrl?: string | null) {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith('http') || pdfUrl.startsWith('/')) return pdfUrl;
    const normalized = pdfUrl.replace(/^\.?\/?downloadables\//i, '');
    return `/downloadables/${normalized}`;
}

function useNowTs(intervalMs = 60_000) {
    const [nowTs, setNowTs] = React.useState(() => Date.now());
    React.useEffect(() => {
        const t = window.setInterval(() => setNowTs(Date.now()), intervalMs);
        return () => window.clearInterval(t);
    }, [intervalMs]);
    return nowTs;
}

function formatEventWindow(startsAt: string, endsAt?: string) {
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;

    const dateFmt = new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
    const timeFmt = new Intl.DateTimeFormat('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const date = dateFmt.format(start);
    const startTime = timeFmt.format(start);

    if (!end) return `${date} • ${startTime}`;

    const sameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

    const endTime = timeFmt.format(end);
    if (sameDay) return `${date} • ${startTime}–${endTime}`;

    return `${dateFmt.format(start)} ${startTime} → ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

/**
 * ✅ “Days to go” that won’t show 1 day when the event is later *today*
 * It compares calendar days (start-of-day) not milliseconds.
 */
function daysUntil(startsAt: string, nowTs: number) {
    const start = new Date(startsAt);
    const now = new Date(nowTs);

    const startDay = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
    ).getTime();
    const nowDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    ).getTime();

    const diffDays = Math.floor((startDay - nowDay) / 86_400_000);
    return diffDays <= 0 ? 0 : diffDays;
}

function daysToGoLabel(d: number) {
    if (d <= 0) return 'Today';
    return `${d} day${d === 1 ? '' : 's'} to go`;
}

type EventPhase = 'ongoing' | 'upcoming' | 'closed';

function getEventPhase(
    startsAt: string,
    endsAt: string | undefined,
    nowTs: number,
): EventPhase {
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;
    const nowDateTs = toDateOnlyTimestamp(new Date(nowTs));
    const startDateTs = toDateOnlyTimestamp(start);
    const endDateTs = end ? toDateOnlyTimestamp(end) : null;

    if (endDateTs !== null) {
        if (nowDateTs < startDateTs) return 'upcoming';
        if (nowDateTs <= endDateTs) return 'ongoing';
        return 'closed';
    }

    if (nowDateTs < startDateTs) return 'upcoming';
    if (nowDateTs === startDateTs) return 'ongoing';
    return 'closed';
}

function BadgePill({
    icon,
    children,
    tone = 'neutral',
}: {
    icon?: React.ReactNode;
    children: React.ReactNode;
    tone?: 'neutral' | 'info' | 'success' | 'danger';
}) {
    const toneClass =
        tone === 'success'
            ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/30'
            : tone === 'danger'
              ? 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-500/30'
              : tone === 'info'
                ? 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-500/30'
                : 'bg-white/70 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-700';

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1 backdrop-blur',
                'shadow-[0_10px_22px_-20px_rgba(2,6,23,0.25)]',
                toneClass,
            )}
        >
            {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
            <span className="whitespace-nowrap">{children}</span>
        </span>
    );
}

/** ✅ Beautified section header */
type SectionTone = 'ongoing' | 'upcoming' | 'closed';

function SectionTitle({
    title,
    count,
    subtitle,
    tone,
}: {
    title: string;
    count?: number;
    subtitle?: string;
    tone: SectionTone;
}) {
    const meta =
        tone === 'ongoing'
            ? {
                  icon: <CircleCheck className="h-4 w-4" />,
                  iconWrap:
                      'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
                  titleAccent: 'text-emerald-800 dark:text-emerald-200',
                  line: 'from-emerald-500/35 via-emerald-500/10 to-transparent',
                  countPill:
                      'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-500/30',
              }
            : tone === 'upcoming'
              ? {
                    icon: <CalendarClock className="h-4 w-4" />,
                    iconWrap:
                        'bg-[#0033A0]/10 text-[#0033A0] dark:bg-[#7aa2ff]/15 dark:text-[#b9ccff]',
                    titleAccent: 'text-[#0033A0] dark:text-[#b9ccff]',
                    line: 'from-[#0033A0]/35 via-[#0033A0]/10 to-transparent',
                    countPill:
                        'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-500/30',
                }
              : {
                    icon: <CircleX className="h-4 w-4" />,
                    iconWrap:
                        'bg-rose-600/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
                    titleAccent: 'text-rose-800 dark:text-rose-200',
                    line: 'from-rose-500/35 via-rose-500/10 to-transparent',
                    countPill:
                        'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-500/30',
                };

    return (
        <div className="mt-10">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <span
                            className={cn(
                                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10',
                                meta.iconWrap,
                            )}
                        >
                            {meta.icon}
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <div
                                    className={cn(
                                        'text-base font-semibold tracking-tight sm:text-lg',
                                        meta.titleAccent,
                                    )}
                                >
                                    {title}
                                </div>

                                {typeof count === 'number' ? (
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur',
                                            meta.countPill,
                                        )}
                                    >
                                        {count} item{count === 1 ? '' : 's'}
                                    </span>
                                ) : null}
                            </div>

                            {subtitle ? (
                                <div className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                                    {subtitle}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div
                aria-hidden
                className={cn('mt-3 h-px w-full bg-gradient-to-r', meta.line)}
            />
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#0033A0]/10 text-[#0033A0] dark:bg-[#0033A0]/20">
                <Sparkles className="h-4 w-4" />
            </div>
            {text}
        </div>
    );
}

function ImagePreviewDialog({
    src,
    title,
    subtitle,
    children,
}: {
    src: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>

            <DialogContent className="max-w-5xl overflow-hidden p-0">
                <div className="relative bg-slate-950">
                    <img
                        src={src}
                        alt={title}
                        className="max-h-[78vh] w-full object-contain"
                        loading="lazy"
                        draggable={false}
                    />
                </div>

                <div className="p-4 sm:p-5">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-slate-100">
                            {title}
                        </DialogTitle>
                        {subtitle ? (
                            <DialogDescription className="text-slate-600 dark:text-slate-300">
                                {subtitle}
                            </DialogDescription>
                        ) : null}
                    </DialogHeader>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const CLAMP_CLASS: Record<number, string> = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
    5: 'line-clamp-5',
    6: 'line-clamp-6',
};

function ExpandableText({
    id,
    text,
    lines = 3,
    className,
    tone = 'brand',
}: {
    id?: string;
    text: string;
    lines?: 1 | 2 | 3 | 4 | 5 | 6;
    className?: string;
    tone?: 'brand' | 'muted';
}) {
    const [expanded, setExpanded] = React.useState(false);
    const [canToggle, setCanToggle] = React.useState(false);

    const wrapRef = React.useRef<HTMLDivElement>(null);
    const clampRef = React.useRef<HTMLParagraphElement>(null);
    const fullRef = React.useRef<HTMLParagraphElement>(null);

    const clampClass = CLAMP_CLASS[lines] ?? 'line-clamp-3';

    React.useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const clampEl = clampRef.current;
        const fullEl = fullRef.current;
        if (!wrap || !clampEl || !fullEl) return;

        const compute = () => {
            const clampH = clampEl.getBoundingClientRect().height;
            const fullH = fullEl.getBoundingClientRect().height;

            // If full height is meaningfully bigger than clamped height, we are truncating
            setCanToggle(fullH - clampH > 1);
        };

        compute();

        const ro = new ResizeObserver(() => compute());
        ro.observe(wrap);

        return () => ro.disconnect();
    }, [text, lines]);

    const btnTone =
        tone === 'muted'
            ? 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            : 'text-[#0033A0] hover:text-[#0033A0]/90 dark:text-[#b9ccff] dark:hover:text-[#cfe0ff]';

    return (
        <div ref={wrapRef} className="relative">
            <p id={id} className={cn(className, !expanded && clampClass)}>
                {text}
            </p>

            {canToggle ? (
                <div className="mt-1 flex justify-end">
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                        aria-controls={id}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold',
                            'focus-visible:ring-2 focus-visible:ring-[#0033A0]/30 focus-visible:outline-none',
                            btnTone,
                        )}
                    >
                        {expanded ? 'Hide' : 'Show more'}
                        {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            ) : null}

            {/* hidden measurement nodes (do not affect layout) */}
            <div
                aria-hidden
                className="pointer-events-none absolute top-0 left-0 -z-10 w-full opacity-0"
            >
                <p ref={clampRef} className={cn(className, clampClass)}>
                    {text}
                </p>
                <p ref={fullRef} className={cn(className)}>
                    {text}
                </p>
            </div>
        </div>
    );
}

/** ✅ Compact grid tile: good for up to 20 events, responsive */
function EventTile({
    item,
    phase,
    nowTs,
    featured = false,
}: {
    item: FlexHoverItem;
    phase: EventPhase;
    nowTs: number;
    featured?: boolean;
}) {
    const d = daysUntil(item.startsAt, nowTs);
    const [imgOk, setImgOk] = React.useState(() => Boolean(item.image));

    React.useEffect(() => {
        setImgOk(Boolean(item.image));
    }, [item.image]);

    const isClosed = phase === 'closed';
    const isUpcoming = phase === 'upcoming';
    const isOngoing = phase === 'ongoing';

    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 backdrop-blur',
                'shadow-[0_14px_40px_-44px_rgba(2,6,23,0.22)]',
                'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-52px_rgba(2,6,23,0.34)]',
                'dark:border-slate-700 dark:bg-slate-900/40',
                isClosed && 'bg-slate-50/70 dark:bg-slate-950/30',
                featured &&
                    !isClosed &&
                    'ring-1 ring-emerald-300/40 dark:ring-emerald-500/25',
            )}
        >
            <div
                className={cn(
                    'absolute inset-0',
                    item.tint,
                    isClosed && 'opacity-30',
                )}
            />
            <div
                className={cn(
                    'absolute inset-0 bg-gradient-to-b from-white/55 via-white/20 to-white/70 dark:from-slate-900/30 dark:via-slate-900/10 dark:to-slate-900/55',
                    isClosed && 'opacity-70',
                )}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
            />

            <div
                className={cn(
                    'relative p-3.5 sm:p-4',
                    isClosed && 'opacity-90',
                )}
            >
                {/* image (click to preview) */}

                {imgOk && item.image ? (
                    <ImagePreviewDialog
                        src={item.image}
                        title={item.title}
                        subtitle={formatEventWindow(item.startsAt, item.endsAt)}
                    >
                        <button
                            type="button"
                            className={cn(
                                'relative w-full overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-700',
                                'focus-visible:ring-2 focus-visible:ring-[#0033A0]/35 focus-visible:outline-none',
                            )}
                            aria-label={`View image for ${item.title}`}
                        >
                            <img
                                src={item.image}
                                alt={item.title}
                                onError={() => setImgOk(false)} // ✅ broken image -> show placeholder
                                className={cn(
                                    featured ? 'h-36 sm:h-40' : 'h-28 sm:h-32',
                                    'w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
                                    isClosed && 'grayscale',
                                )}
                                loading="lazy"
                                draggable={false}
                            />

                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/25" />

                            {/* top-right zoom hint */}
                            <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                                <ZoomIn className="h-3.5 w-3.5" />
                                View
                            </div>

                            {/* top-left status chip */}
                            <div className="absolute top-2 left-2 flex items-center gap-2">
                                {featured && !isClosed ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Featured
                                    </span>
                                ) : null}

                                {isClosed ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                        <CircleX className="h-3.5 w-3.5" />
                                        Closed
                                    </span>
                                ) : isOngoing ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                        <CircleCheck className="h-3.5 w-3.5" />
                                        Ongoing
                                    </span>
                                ) : isUpcoming ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#0033A0]/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        Upcoming
                                    </span>
                                ) : null}
                            </div>
                        </button>
                    </ImagePreviewDialog>
                ) : (
                    <div
                        className={cn(
                            'relative w-full overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-700',
                        )}
                        role="img"
                        aria-label={`No image found for ${item.title}`}
                    >
                        <div
                            className={cn(
                                featured ? 'h-36 sm:h-40' : 'h-28 sm:h-32',
                                'flex items-center justify-center',
                                'bg-white/60 dark:bg-slate-950/30',
                            )}
                        >
                            <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                                <ImageOff className="h-8 w-8" />
                                <span className="text-[11px] font-semibold">
                                    No image found
                                </span>
                            </div>
                        </div>

                        {/* subtle overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/25" />

                        {/* top-right label */}
                        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                            <ImageOff className="h-3.5 w-3.5" />
                            No image
                        </div>

                        {/* top-left status chip (same as before) */}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                            {featured && !isClosed ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Featured
                                </span>
                            ) : null}

                            {isClosed ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                    <CircleX className="h-3.5 w-3.5" />
                                    Closed
                                </span>
                            ) : isOngoing ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                    <CircleCheck className="h-3.5 w-3.5" />
                                    Ongoing
                                </span>
                            ) : isUpcoming ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-[#0033A0]/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Upcoming
                                </span>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                    <BadgePill
                        tone="info"
                        icon={<CalendarClock className="h-3.5 w-3.5" />}
                    >
                        {formatEventWindow(item.startsAt, item.endsAt)}
                    </BadgePill>

                    {isClosed ? (
                        <BadgePill
                            tone="danger"
                            icon={<CircleX className="h-3.5 w-3.5" />}
                        >
                            Closed
                        </BadgePill>
                    ) : isOngoing ? (
                        <BadgePill
                            tone="success"
                            icon={<CircleCheck className="h-3.5 w-3.5" />}
                        >
                            Ongoing Today
                        </BadgePill>
                    ) : (
                        <BadgePill icon={<Timer className="h-3.5 w-3.5" />}>
                            {daysToGoLabel(d)}
                        </BadgePill>
                    )}
                </div>

                {/* ✅ nicer typography for item */}
                <div
                    className={cn(
                        'mt-2 text-[15px] leading-snug font-semibold tracking-tight text-slate-900 dark:text-slate-100',
                        'line-clamp-2',
                        isClosed && 'text-slate-700 dark:text-slate-200',
                    )}
                >
                    {item.title}
                </div>

                <div className="mt-2">
                    <ExpandableText
                        id={`event-desc-${item.id}`}
                        text={item.body}
                        lines={3}
                        tone={isClosed ? 'muted' : 'brand'}
                        className={cn(
                            'text-sm leading-relaxed text-slate-600 dark:text-slate-300',
                            isClosed && 'text-slate-500 dark:text-slate-400',
                        )}
                    />
                </div>

                {item.cta ? (
                    <div className="mt-4 flex justify-end">
                        <Button
                            asChild
                            variant={isClosed ? 'outline' : 'default'}
                            className={cn(
                                'h-9 rounded-xl px-3.5 transition',
                                isClosed
                                    ? 'border-slate-300 bg-white/60 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-950/45'
                                    : 'bg-[#0033A0] text-white shadow hover:bg-[#0033A0]/95 focus-visible:ring-2 focus-visible:ring-[#0033A0]/30',
                            )}
                        >
                            <a
                                href={item.cta.href}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {item.cta.label ?? 'View details'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function ProgrammeGroups({
    items,
    query,
}: {
    items: FlexHoverItem[];
    query: string;
}) {
    const nowTs = useNowTs(60_000);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredItems = React.useMemo(() => {
        if (!normalizedQuery) return items;
        return items.filter((item) => {
            const haystack = `${item.title} ${item.body}`.toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [items, normalizedQuery]);

    const enriched = React.useMemo(() => {
        return filteredItems
            .map((it) => ({
                ...it,
                _startTs: new Date(it.startsAt).getTime(),
                _endOrStartTs: new Date(it.endsAt ?? it.startsAt).getTime(),
                _phase: getEventPhase(it.startsAt, it.endsAt, nowTs),
            }))
            .sort((a, b) => a._startTs - b._startTs);
    }, [filteredItems, nowTs]);

    const ongoing = enriched
        .filter((x) => x._phase === 'ongoing')
        .sort((a, b) => a._startTs - b._startTs);
    const upcoming = enriched
        .filter((x) => x._phase === 'upcoming')
        .sort((a, b) => a._startTs - b._startTs);
    const closed = enriched
        .filter((x) => x._phase === 'closed')
        .sort((a, b) => b._endOrStartTs - a._endOrStartTs);

    return (
        <div className="mt-3">
            {/* ONGOING (CENTERED) */}
            <SectionTitle
                tone="ongoing"
                title="Ongoing Today"
                count={ongoing.length}
                subtitle="Happening today."
            />

            {ongoing.length ? (
                ongoing.length === 1 ? (
                    <div className="mt-4 flex justify-center">
                        <div className="w-full max-w-md">
                            <EventTile
                                item={ongoing[0]}
                                phase="ongoing"
                                nowTs={nowTs}
                                featured
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {ongoing.map((it) => (
                            <EventTile
                                key={it.id}
                                item={it}
                                phase="ongoing"
                                nowTs={nowTs}
                                featured
                            />
                        ))}
                    </div>
                )
            ) : (
                <EmptyState text="No ongoing event today." />
            )}

            {/* UPCOMING */}
            <SectionTitle
                tone="upcoming"
                title="Upcoming Events"
                count={upcoming.length}
                subtitle="Plan ahead—see what’s next."
            />
            {upcoming.length ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map((it) => (
                        <EventTile
                            key={it.id}
                            item={it}
                            phase="upcoming"
                            nowTs={nowTs}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState text="No upcoming events." />
            )}

            {/* CLOSED */}
            <SectionTitle
                tone="closed"
                title="Closed Events"
                count={closed.length}
                subtitle="Past activities."
            />
            {closed.length ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {closed.map((it) => (
                        <EventTile
                            key={it.id}
                            item={it}
                            phase="closed"
                            nowTs={nowTs}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState text="No closed events yet." />
            )}
        </div>
    );
}

export default function Programme({ programmes = [] }: PageProps) {
    const [query, setQuery] = React.useState('');
    const items = React.useMemo<FlexHoverItem[]>(() => {
        return programmes.map((programme, index) => {
            const pdfUrl = resolvePdfUrl(programme.pdf_url);
            const startsAt = programme.starts_at ?? new Date().toISOString();

            return {
                id: programme.id,
                title: programme.title,
                body: programme.description,
                image: resolveImageUrl(programme.image_url),
                tint: TINTS[index % TINTS.length],
                startsAt,
                endsAt: programme.ends_at ?? undefined,
                cta: pdfUrl ? { label: 'View more', href: pdfUrl } : undefined,
            };
        });
    }, [programmes]);

    return (
        <>
            <Head title="Event" />

            <PublicLayout navActive="/event">
                <section className="relative isolate mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                    {/* background */}
                    {/* <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950/60 dark:to-slate-950"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -left-28 -top-28 -z-10 h-72 w-72 rounded-full bg-[#0033A0]/12 blur-3xl"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-28 top-28 -z-10 h-72 w-72 rounded-full bg-[#FCD116]/18 blur-3xl"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background:radial-gradient(1200px_circle_at_20%_0%,rgba(0,51,160,0.12),transparent_55%),radial-gradient(900px_circle_at_90%_20%,rgba(252,209,22,0.16),transparent_55%)]"
                    /> */}

                    {/* header */}
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl dark:text-slate-100">
                            <span className="relative inline-block">
                                <span className="relative z-10 text-[#0033A0] dark:text-[#7aa2ff]">
                                    Event
                                </span>
                                <span className="pointer-events-none absolute inset-x-0 bottom-1 -z-0 h-2 rounded-full bg-[#0033A0]/15 blur-[1px] dark:bg-[#7aa2ff]/20" />
                            </span>
                        </h2>

                        <div className="mx-auto mt-5 flex items-center justify-center gap-3">
                            <span className="h-px w-10 bg-slate-200 dark:bg-slate-700" />
                            <span className="h-2 w-2 rounded-full bg-[#FCD116] shadow-[0_0_0_6px_rgba(252,209,22,0.12)]" />
                            <span className="h-px w-10 bg-slate-200 dark:bg-slate-700" />
                        </div>
                    </div>
                    {/* list area */}
                    <div className="mx-auto mt-6 max-w-5xl">
                        <div className="relative mx-auto mb-6 max-w-xl">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Search ongoing, upcoming, or closed events..."
                                className="h-11 rounded-2xl border-slate-200 bg-white/80 pl-9 text-sm shadow-sm focus-visible:ring-[#0033A0]/30 dark:border-slate-700 dark:bg-slate-900/60"
                            />
                        </div>
                        {items.length ? (
                            <ProgrammeGroups items={items} query={query} />
                        ) : (
                            <EmptyState text="No events are available yet." />
                        )}
                    </div>
                </section>
            </PublicLayout>
        </>
    );
}
