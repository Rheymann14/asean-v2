import AppLayout from '@/layouts/app-layout';
import { splitCountriesByAsean } from '@/lib/countries';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';
import {
    CalendarFold,
    Check,
    ChevronsUpDown,
    Filter,
    House,
    QrCode,
    Star,
    Users,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
];

type CountryOption = {
    id: number;
    code: string;
    name: string;
    flag_url?: string | null;
};

type EventParticipant = {
    id: number | null;
    name: string | null;
    email: string | null;
    display_id: string | null;
    country_id: number | null;
    country_name: string | null;
    country_flag_url: string | null;
    scanned_at: string | null;
};

type DashboardEvent = {
    id: number;
    title: string;
    starts_at: string | null;
    attendance_count: number;
    joined_count: number;
    joined_by_country: Record<string, number>;
    participants: EventParticipant[];
};

type LineDatum = {
    month: number;
    label: string;
    scans: number;
    scans_by_country: Record<string, number>;
};

type FeedbackEntry = {
    id: number;
    user_experience_rating: number | null;
    event_ratings: Record<string, number> | null;
    recommendations: string | null;
    created_at: string | null;
};

type PageProps = {
    countries: CountryOption[];
    stats: {
        participants_total: number;
        events_total: number;
        scans_total: number;
    };
    country_stats: Record<string, { participants: number; scans: number }>;
    events: DashboardEvent[];
    line_data: LineDatum[];
    feedback: {
        total: number;
        avg_rating: number | null;
        entries: FeedbackEntry[];
    };
};

function formatShortDate(dateString?: string | null) {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    }).format(date);
}

function formatTime(dateString?: string | null) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function getFlagSrc(country?: CountryOption | null) {
    if (!country) return null;
    if (country.flag_url) return country.flag_url;
    const code = (country.code || '').toLowerCase().trim();
    return code ? `/asean/${code}.png` : null;
}

function KpiCard({
    title,
    value,
    icon: Icon,
    hint,
    badge,
    tint,
}: {
    title: string;
    value: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    hint?: React.ReactNode;
    badge?: React.ReactNode;
    tint: string;
}) {
    return (
        <Card className="relative overflow-hidden rounded-2xl border border-sidebar-border/70 dark:border-sidebar-border">
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-0 opacity-70',
                    tint,
                )}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background"
            />

            <CardHeader className="relative flex flex-row items-start justify-between space-y-0 p-4">
                <div className="min-w-0 space-y-1">
                    <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground">
                        {title}
                    </CardTitle>
                    <div className="truncate text-2xl font-semibold tracking-tight text-foreground">
                        {value}
                    </div>
                    {hint ? (
                        <div className="text-xs text-muted-foreground">
                            {hint}
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    {badge}
                    <div className="grid size-9 place-items-center rounded-xl border bg-background/70 backdrop-blur">
                        <Icon className="size-4 text-foreground/70" />
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
    const filled = Math.round(value);
    return (
        <div
            className="inline-flex items-center gap-0.5"
            aria-label={`${value} out of ${max} stars`}
        >
            {Array.from({ length: max }, (_, index) => {
                const isFilled = index + 1 <= filled;
                return (
                    <Star
                        key={index}
                        className={cn(
                            'h-3 w-3',
                            isFilled
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/40',
                        )}
                    />
                );
            })}
        </div>
    );
}

export default function Dashboard() {
    const { props } = usePage<PageProps>();
    const [open, setOpen] = React.useState(false);
    const [country, setCountry] = React.useState<string | null>(null);
    const [attendanceOpen, setAttendanceOpen] = React.useState(false);
    const [selectedEvent, setSelectedEvent] = React.useState<
        (DashboardEvent & { participants: EventParticipant[] }) | null
    >(null);
    const [expandedFeedback, setExpandedFeedback] = React.useState<
        Record<number, boolean>
    >({});

    const {
        countries,
        stats,
        events,
        country_stats: countryStats,
        line_data: lineData,
        feedback,
    } = props;
    const groupedCountries = React.useMemo(
        () => splitCountriesByAsean(countries),
        [countries],
    );

    const countryId = country ? Number(country) : null;
    const current = countryId
        ? (countries.find((c) => c.id === countryId) ?? null)
        : null;

    // ✅ Subtle chart colors (no gradients)
    const CHART_PRIMARY = '#60a5fa'; // soft blue
    const CHART_ACCENT = '#fcd34d'; // soft amber
    const PIE_SCANNED = '#86efac'; // soft green
    const PIE_NOT = '#fda4af'; // soft rose

    const filteredParticipants = countryId
        ? (countryStats?.[String(countryId)]?.participants ?? 0)
        : stats.participants_total;
    const filteredScans = countryId
        ? (countryStats?.[String(countryId)]?.scans ?? 0)
        : stats.scans_total;

    const attendanceByEvent = React.useMemo(() => {
        return events.map((event) => {
            const filtered = countryId
                ? event.participants.filter(
                    (participant) => participant.country_id === countryId,
                )
                : event.participants;

            return {
                ...event,
                participants: filtered,
                attendance: countryId
                    ? filtered.length
                    : event.attendance_count,
                joined: countryId
                    ? (event.joined_by_country?.[String(countryId)] ?? 0)
                    : event.joined_count,
            };
        });
    }, [events, countryId]);

    const topEventsRows = React.useMemo(() => {
        return attendanceByEvent
            .slice()
            .sort((a, b) => b.attendance - a.attendance)
            .slice(0, 20);
    }, [attendanceByEvent]);

    const maxScanned = React.useMemo(
        () => Math.max(1, ...topEventsRows.map((x) => x.attendance)),
        [topEventsRows],
    );

    const joinedByEvent = React.useMemo(() => {
        const eventsByJoined = attendanceByEvent
            .slice()
            .sort((a, b) => b.joined - a.joined)
            .map((event) => ({
                name: event.title,
                joined: event.joined,
            }));

        if (!eventsByJoined.length) {
            return [{ name: 'No events yet', joined: 0 }];
        }

        return eventsByJoined.slice(0, 20);
    }, [attendanceByEvent]);

    // ✅ keep the bar from looking "full" when max joined is only 1
    const maxJoined = React.useMemo(() => {
        return Math.max(0, ...joinedByEvent.map((d) => Number(d.joined ?? 0)));
    }, [joinedByEvent]);

    // minimum axis max = 5, then round up to nearest 5 for nicer scaling
    const joinedXAxisMax = React.useMemo(() => {
        return Math.max(5, Math.ceil(maxJoined / 5) * 5);
    }, [maxJoined]);

    const joinedTickStep = React.useMemo(() => {
        if (joinedXAxisMax <= 10) return 1;
        if (joinedXAxisMax <= 25) return 5;
        return 10;
    }, [joinedXAxisMax]);

    const joinedTicks = React.useMemo(() => {
        const steps = Math.floor(joinedXAxisMax / joinedTickStep);
        return Array.from({ length: steps + 1 }, (_, i) => i * joinedTickStep);
    }, [joinedXAxisMax, joinedTickStep]);

    const joinedChartHeight = React.useMemo(() => {
        const rows = Math.max(1, joinedByEvent.length);

        const ROW_HEIGHT = 22;
        const TOP_BOTTOM = 24;

        // ✅ smaller minimum height when few rows (fixes the “too much empty space” look)
        const MIN = rows <= 2 ? 150 : 190;

        // keep it from growing too tall
        const MAX = 280;

        return Math.min(MAX, Math.max(MIN, rows * ROW_HEIGHT + TOP_BOTTOM));
    }, [joinedByEvent.length]);

    const chartLineData = React.useMemo(() => {
        return lineData.map((item) => ({
            day: item.label,
            scans: countryId
                ? (item.scans_by_country[String(countryId)] ?? 0)
                : item.scans,
        }));
    }, [lineData, countryId]);

    const donut = React.useMemo(() => {
        const scanned = Math.max(0, filteredScans);
        const remaining = Math.max(0, filteredParticipants - scanned);
        const total = Math.max(1, scanned + remaining);
        const rate = Math.round((scanned / total) * 100);

        return {
            scanned,
            remaining,
            total,
            rate,
            data: [
                { name: 'Scanned', value: scanned },
                { name: 'Not scanned', value: remaining },
            ],
        };
    }, [filteredParticipants, filteredScans]);

    const currentBadge = current ? (
        <Badge variant="secondary" className="rounded-full">
            Filtered
        </Badge>
    ) : null;

    const selectedParticipants = selectedEvent?.participants ?? [];
    const selectedEventDate = selectedEvent?.starts_at
        ? formatShortDate(selectedEvent.starts_at)
        : null;

    const openAttendance = (
        event: (DashboardEvent & { participants: EventParticipant[] }) | null,
    ) => {
        setSelectedEvent(event);
        setAttendanceOpen(!!event);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-3 overflow-x-auto rounded-xl p-3">
                {/* Header (compact) */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <House className="h-5 w-5 text-[#00359c]" />
                            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                Dashboard
                            </h1>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {current ? (
                                <span className="inline-flex items-center gap-2">
                                    Showing for
                                    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-2 py-1 text-foreground">
                                        {getFlagSrc(current) ? (
                                            <img
                                                src={getFlagSrc(current) ?? ''}
                                                alt=""
                                                className="size-4 rounded-full object-cover"
                                            />
                                        ) : null}
                                        <span className="max-w-[170px] truncate font-medium">
                                            {current.name}
                                        </span>
                                    </span>
                                    <Badge
                                        variant="secondary"
                                        className="rounded-full text-[11px]"
                                    >
                                        {filteredParticipants.toLocaleString()}{' '}
                                        participants
                                    </Badge>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2">
                                    Showing for all countries
                                    <Badge
                                        variant="secondary"
                                        className="rounded-full text-[11px]"
                                    >
                                        {filteredParticipants.toLocaleString()}{' '}
                                        participants
                                    </Badge>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Country filter */}
                    <div className="flex items-center gap-2">
                        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                            <Filter className="size-4" />
                            Filter:
                        </div>

                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-9 justify-between rounded-xl px-3 text-xs"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        {current ? (
                                            <>
                                                {getFlagSrc(current) ? (
                                                    <img
                                                        src={
                                                            getFlagSrc(
                                                                current,
                                                            ) ?? ''
                                                        }
                                                        alt=""
                                                        className="size-5 rounded-full object-cover"
                                                    />
                                                ) : null}
                                                <span className="max-w-[180px] truncate">
                                                    {current.name}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                All countries
                                            </span>
                                        )}
                                    </span>
                                    <ChevronsUpDown className="ml-2 size-4 opacity-60" />
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent
                                className="w-[300px] p-0"
                                align="end"
                            >
                                <Command>
                                    <CommandInput placeholder="Search country..." />
                                    <CommandEmpty>No results.</CommandEmpty>

                                    {/* ✅ scrollable countries list */}
                                    <CommandList className="max-h-[320px] overflow-auto overscroll-contain">
                                        <CommandGroup>
                                            <CommandItem
                                                value="__all__"
                                                onSelect={() => {
                                                    setCountry(null);
                                                    setOpen(false);
                                                }}
                                                className="gap-2"
                                            >
                                                <span className="inline-flex size-4 items-center justify-center">
                                                    {!country ? <Check className="size-4" /> : null}
                                                </span>
                                                <span>All countries</span>
                                            </CommandItem>
                                        </CommandGroup>

                                        <CommandGroup heading="ASEAN Countries">
                                            {groupedCountries.asean.map((c) => {
                                                const participantCount =
                                                    countryStats?.[String(c.id)]?.participants ?? 0;

                                                return (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={String(c.id)}
                                                        onSelect={() => {
                                                            setCountry(String(c.id));
                                                            setOpen(false);
                                                        }}
                                                        className="gap-2"
                                                    >
                                                        <span className="inline-flex size-4 items-center justify-center">
                                                            {country === String(c.id) ? (
                                                                <Check className="size-4" />
                                                            ) : null}
                                                        </span>
                                                        {getFlagSrc(c) ? (
                                                            <img
                                                                src={getFlagSrc(c) ?? ''}
                                                                alt=""
                                                                className="size-5 rounded-full object-cover"
                                                            />
                                                        ) : null}
                                                        <span className="truncate">{c.name}</span>
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-auto rounded-full text-[11px]"
                                                        >
                                                            {participantCount.toLocaleString()}
                                                        </Badge>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>

                                        {groupedCountries.nonAsean.length > 0 ? (
                                            <CommandGroup heading="Non-ASEAN Countries">
                                                {groupedCountries.nonAsean.map((c) => {
                                                    const participantCount =
                                                        countryStats?.[String(c.id)]?.participants ?? 0;

                                                    return (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={String(c.id)}
                                                            onSelect={() => {
                                                                setCountry(String(c.id));
                                                                setOpen(false);
                                                            }}
                                                            className="gap-2"
                                                        >
                                                            <span className="inline-flex size-4 items-center justify-center">
                                                                {country === String(c.id) ? (
                                                                    <Check className="size-4" />
                                                                ) : null}
                                                            </span>
                                                            {getFlagSrc(c) ? (
                                                                <img
                                                                    src={getFlagSrc(c) ?? ''}
                                                                    alt=""
                                                                    className="size-5 rounded-full object-cover"
                                                                />
                                                            ) : null}
                                                            <span className="truncate">{c.name}</span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="ml-auto rounded-full text-[11px]"
                                                            >
                                                                {participantCount.toLocaleString()}
                                                            </Badge>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        ) : null}
                                    </CommandList>
                                </Command>

                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* KPI row */}
                <div className="grid gap-3 md:grid-cols-3">
                    <KpiCard
                        title="Participants"
                        value={filteredParticipants.toLocaleString()}
                        icon={Users}
                        badge={currentBadge}
                        hint={
                            <span>
                                Overall:{' '}
                                <span className="font-medium text-foreground">
                                    {stats.participants_total.toLocaleString()}
                                </span>
                            </span>
                        }
                        tint="bg-gradient-to-br from-sky-500/15 via-transparent to-indigo-500/10"
                    />

                    <KpiCard
                        title="Events"
                        value={stats.events_total.toLocaleString()}
                        icon={CalendarFold}
                        hint="Total events in the programme"
                        tint="bg-gradient-to-br from-emerald-500/12 via-transparent to-cyan-500/10"
                    />

                    <KpiCard
                        title="QR Scans"
                        value={filteredScans.toLocaleString()}
                        icon={QrCode}
                        hint={
                            <span className="inline-flex items-center gap-2">
                                Scan rate
                                <Badge
                                    className="rounded-full"
                                    variant="secondary"
                                >
                                    {donut.rate}%
                                </Badge>
                            </span>
                        }
                        tint="bg-gradient-to-br from-amber-500/12 via-transparent to-rose-500/10"
                    />
                </div>

                {/* Charts */}
                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Scan Trend (Area) - no gradient */}
                    <Card className="rounded-2xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm">
                                        Scan Trend
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground">
                                        January to December
                                    </div>
                                </div>

                                <Badge
                                    variant="secondary"
                                    className="rounded-full text-[11px]"
                                >
                                    Live
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="h-[210px] p-4 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartLineData}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -10,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="opacity-30"
                                    />
                                    <XAxis
                                        dataKey="day"
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-[11px]"
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-[11px]"
                                    />

                                    <Tooltip
                                        content={({
                                            active,
                                            payload,
                                            label,
                                        }: any) => {
                                            if (!active || !payload?.length)
                                                return null;
                                            return (
                                                <div className="rounded-xl border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
                                                    <div className="font-medium text-foreground">
                                                        {String(label ?? '')}
                                                    </div>
                                                    <div className="mt-1 text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {Number(
                                                                payload[0]
                                                                    ?.value ??
                                                                0,
                                                            ).toLocaleString()}
                                                        </span>{' '}
                                                        scans
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="scans"
                                        stroke={CHART_PRIMARY}
                                        strokeWidth={2.25}
                                        fill={CHART_PRIMARY}
                                        fillOpacity={0.16}
                                        dot={false}
                                        activeDot={{
                                            r: 4,
                                            stroke: CHART_ACCENT,
                                            fill: 'white',
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="p-4 pb-2">
                            <div className="space-y-0.5">
                                <CardTitle className="text-sm">
                                    Participants Joined by Event
                                </CardTitle>
                                <div className="text-xs text-muted-foreground">
                                    Top events by registrations
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-2">
                            <div className="max-h-[280px] overflow-auto pr-1">
                                <div
                                    style={{ height: joinedChartHeight }}
                                    className="min-h-[210px]"
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={joinedByEvent}
                                            layout="vertical"
                                            margin={{
                                                top: 10,
                                                right: 10,
                                                left: 10,
                                                bottom: 10,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="opacity-30"
                                            />
                                            <XAxis
                                                type="number"
                                                domain={[0, joinedXAxisMax]}
                                                ticks={joinedTicks}
                                                allowDecimals={false}
                                                tickLine={false}
                                                axisLine={false}
                                                className="text-[11px]"
                                            />

                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                tickLine={false}
                                                axisLine={false}
                                                width={140}
                                                className="text-[11px]"
                                                tickFormatter={(
                                                    value: string,
                                                ) =>
                                                    value.length > 18
                                                        ? `${value.slice(0, 18)}…`
                                                        : value
                                                }
                                            />
                                            <Tooltip
                                                content={({
                                                    active,
                                                    payload,
                                                    label,
                                                }: any) => {
                                                    if (
                                                        !active ||
                                                        !payload?.length
                                                    )
                                                        return null;
                                                    return (
                                                        <div className="rounded-xl border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
                                                            <div className="font-medium text-foreground">
                                                                {String(
                                                                    label ?? '',
                                                                )}
                                                            </div>
                                                            <div className="mt-1 text-muted-foreground">
                                                                <span className="font-semibold text-foreground">
                                                                    {Number(
                                                                        payload[0]
                                                                            ?.value ??
                                                                        0,
                                                                    ).toLocaleString()}
                                                                </span>{' '}
                                                                joined
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar
                                                dataKey="joined"
                                                fill={CHART_PRIMARY}
                                                radius={[0, 6, 6, 0]}
                                                barSize={14}
                                            >
                                                <LabelList
                                                    dataKey="joined"
                                                    position="right"
                                                    className="fill-muted-foreground text-[10px]"
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Donut (subtle solid colors) */}
                    <Card className="relative overflow-hidden rounded-2xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="relative p-4 pb-2">
                            <CardTitle className="text-sm">Scan Rate</CardTitle>
                            <div className="text-xs text-muted-foreground">
                                Scanned vs not scanned
                            </div>
                        </CardHeader>

                        <CardContent className="relative h-[210px] p-4 pt-2">
                            <div className="absolute inset-0 grid place-items-center pt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-semibold tracking-tight">
                                        {donut.rate}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        completed
                                    </div>
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        content={({ active, payload }: any) => {
                                            if (!active || !payload?.length)
                                                return null;
                                            const item = payload[0];
                                            return (
                                                <div className="rounded-xl border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
                                                    <div className="font-medium text-foreground">
                                                        {String(
                                                            item?.name ?? '',
                                                        )}
                                                    </div>
                                                    <div className="mt-1 text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            {Number(
                                                                item?.value ??
                                                                0,
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Pie
                                        data={donut.data}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        stroke="transparent"
                                    >
                                        <Cell fill={PIE_SCANNED} />
                                        <Cell fill={PIE_NOT} />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                                <div className="inline-flex items-center gap-2 text-muted-foreground">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: PIE_SCANNED }}
                                    />
                                    Scanned:{' '}
                                    <span className="font-medium text-foreground">
                                        {donut.scanned.toLocaleString()}
                                    </span>
                                </div>
                                <div className="inline-flex items-center gap-2 text-muted-foreground">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: PIE_NOT }}
                                    />
                                    Not:{' '}
                                    <span className="font-medium text-foreground">
                                        {donut.remaining.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Top Events table */}
                    <Card className="rounded-2xl border border-sidebar-border/70 lg:col-span-2 dark:border-sidebar-border">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm">
                                        Top Events
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground">
                                        Sorted by check-ins
                                    </div>
                                </div>

                                <Badge
                                    variant="secondary"
                                    className="rounded-full text-[11px]"
                                >
                                    {topEventsRows.length} shown
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="max-h-[220px] overflow-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
                                        <tr className="text-muted-foreground">
                                            <th className="w-10 px-4 py-2 text-left font-semibold">
                                                #
                                            </th>
                                            <th className="px-2 py-2 text-left font-semibold">
                                                Event
                                            </th>
                                            <th className="w-24 px-2 py-2 text-left font-semibold">
                                                Date
                                            </th>
                                            <th className="w-24 px-2 py-2 text-right font-semibold">
                                                Joined
                                            </th>
                                            <th className="w-28 px-4 py-2 text-right font-semibold">
                                                Attendance
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {topEventsRows.length ? (
                                            topEventsRows.map((ev, idx) => {
                                                const pct = Math.max(
                                                    0,
                                                    Math.min(
                                                        100,
                                                        Math.round(
                                                            (ev.attendance /
                                                                maxScanned) *
                                                            100,
                                                        ),
                                                    ),
                                                );

                                                return (
                                                    <tr
                                                        key={ev.id}
                                                        className="hover:bg-muted/40"
                                                    >
                                                        {/* ✅ removed dots after number */}
                                                        <td className="px-4 py-2 align-top">
                                                            <span className="font-semibold text-foreground">
                                                                {idx + 1}
                                                            </span>
                                                        </td>

                                                        <td className="px-2 py-2">
                                                            <div className="min-w-0">
                                                                <div
                                                                    className="truncate font-medium text-foreground"
                                                                    title={
                                                                        ev.title
                                                                    }
                                                                >
                                                                    {ev.title}
                                                                </div>

                                                                {/* ✅ subtle solid indicator bar (NO gradient) */}
                                                                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                                                                    <div
                                                                        className="h-1.5 rounded-full"
                                                                        style={{
                                                                            width: `${pct}%`,
                                                                            backgroundColor:
                                                                                CHART_PRIMARY,
                                                                            opacity: 0.9,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-2 py-2 align-top whitespace-nowrap text-muted-foreground">
                                                            {formatShortDate(
                                                                ev.starts_at,
                                                            )}
                                                        </td>

                                                        <td className="px-2 py-2 text-right align-top text-muted-foreground">
                                                            {ev.joined.toLocaleString()}
                                                        </td>

                                                        <td className="px-4 py-2 text-right align-top">
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openAttendance(
                                                                        ev,
                                                                    )
                                                                }
                                                                className="h-7 rounded-full bg-[#0033A0]/10 px-3 text-xs font-semibold text-[#0033A0] hover:bg-[#0033A0]/15 focus-visible:ring-2 focus-visible:ring-[#0033A0]/30"
                                                                title="View attendance details"
                                                                aria-label={`View attendance details: ${ev.attendance.toLocaleString()}`}
                                                            >
                                                                {ev.attendance.toLocaleString()}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td className="px-4 py-2 text-muted-foreground">
                                                    —
                                                </td>
                                                <td className="px-2 py-2 text-muted-foreground">
                                                    No events yet.
                                                </td>
                                                <td className="px-2 py-2 text-muted-foreground">
                                                    —
                                                </td>
                                                <td className="px-2 py-2 text-right text-muted-foreground">
                                                    0
                                                </td>
                                                <td className="px-4 py-2 text-right text-muted-foreground">
                                                    0
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <CardTitle className="text-sm">
                                        Feedback
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground">
                                        Latest responses
                                    </div>
                                </div>

                                <Badge
                                    variant="secondary"
                                    className="rounded-full border border-amber-200/70 bg-amber-50/70 text-[11px] text-amber-800 hover:bg-amber-100/70 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
                                >
                                    {feedback.total.toLocaleString()} total
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-0">
                            <div className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-xs">
                                <span className="text-muted-foreground">
                                    Average rating
                                </span>
                                <div className="flex items-center gap-2">
                                    {feedback.avg_rating !== null ? (
                                        <StarRating
                                            value={feedback.avg_rating}
                                        />
                                    ) : null}
                                    <span className="font-semibold text-foreground">
                                        {feedback.avg_rating !== null
                                            ? `${feedback.avg_rating}/5`
                                            : '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 max-h-[220px] space-y-3 overflow-auto pr-1">
                                {feedback.entries.length ? (
                                    feedback.entries.map((entry) => {
                                        const eventRatings = Object.entries(
                                            entry.event_ratings ?? {},
                                        ).filter(([, value]) => value > 0);
                                        const isExpanded =
                                            expandedFeedback[entry.id] ?? false;
                                        const visibleRatings = isExpanded
                                            ? eventRatings
                                            : eventRatings.slice(0, 2);
                                        const hiddenCount = Math.max(
                                            0,
                                            eventRatings.length - 2,
                                        );

                                        return (
                                            <div
                                                key={entry.id}
                                                className="rounded-xl border px-3 py-2 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-foreground">
                                                        Feedback
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {entry.created_at
                                                            ? formatShortDate(
                                                                entry.created_at,
                                                            )
                                                            : '—'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {entry.user_experience_rating !==
                                                        null ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-foreground">
                                                            UX
                                                            <StarRating
                                                                value={
                                                                    entry.user_experience_rating
                                                                }
                                                            />
                                                        </span>
                                                    ) : null}
                                                    {visibleRatings.map(
                                                        ([label, value]) => (
                                                            <span
                                                                key={label}
                                                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-foreground"
                                                            >
                                                                <span className="truncate">
                                                                    {label}
                                                                </span>
                                                                <StarRating
                                                                    value={
                                                                        value
                                                                    }
                                                                />
                                                            </span>
                                                        ),
                                                    )}
                                                    {hiddenCount > 0 ? (
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100 hover:text-blue-800 focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/15"
                                                            onClick={() =>
                                                                setExpandedFeedback(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [entry.id]:
                                                                            !isExpanded,
                                                                    }),
                                                                )
                                                            }
                                                        >
                                                            {isExpanded
                                                                ? 'Hide'
                                                                : `+${hiddenCount} more`}
                                                        </button>
                                                    ) : null}
                                                </div>
                                                <div className="mt-2 line-clamp-2 text-muted-foreground">
                                                    {entry.recommendations?.trim()
                                                        ? entry.recommendations
                                                        : 'No recommendations shared.'}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                                        No feedback submitted yet.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Dialog
                    open={attendanceOpen}
                    onOpenChange={(open) => {
                        setAttendanceOpen(open);
                        if (!open) {
                            setSelectedEvent(null);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-[760px]">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedEvent
                                    ? `${selectedEvent.title} Attendance`
                                    : 'Attendance'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedEventDate
                                    ? `${selectedEventDate} • `
                                    : ''}{' '}
                                {selectedParticipants.length.toLocaleString()}{' '}
                                checked-in participants
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[420px] overflow-auto rounded-xl border">
                            {selectedParticipants.length ? (
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 z-10 border-b bg-background/95 text-muted-foreground">
                                        <tr>
                                            <th className="w-10 px-3 py-2 text-left font-semibold">
                                                #
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold">
                                                Participant
                                            </th>
                                            <th className="px-3 py-2 text-left font-semibold">
                                                Country
                                            </th>
                                            <th className="w-28 px-3 py-2 text-left font-semibold">
                                                Checked in
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {selectedParticipants.map(
                                            (participant, index) => (
                                                <tr
                                                    key={`${participant.id ?? 'participant'}-${index}`}
                                                    className="hover:bg-muted/40"
                                                >
                                                    <td className="px-3 py-2 align-top text-muted-foreground">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="font-medium text-foreground">
                                                            {participant.name ??
                                                                'Unknown'}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {participant.display_id ??
                                                                participant.email ??
                                                                '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="inline-flex items-center gap-2">
                                                            {participant.country_flag_url ? (
                                                                <img
                                                                    src={
                                                                        participant.country_flag_url
                                                                    }
                                                                    alt=""
                                                                    className="size-4 rounded-full object-cover"
                                                                />
                                                            ) : null}
                                                            <span className="text-muted-foreground">
                                                                {participant.country_name ??
                                                                    '—'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-muted-foreground">
                                                        {formatTime(
                                                            participant.scanned_at,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
                                    No checked-in participants yet.
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
