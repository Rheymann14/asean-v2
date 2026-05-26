import * as React from 'react';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { index as activityLog } from '@/routes/activity-log';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    ExternalLink,
    Filter,
    Search,
    ShieldAlert,
    ShieldCheck,
    TriangleAlert,
    User2,
    FileClock,
    XCircle,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Activity Log', href: activityLog().url },
];

type RawLogStatus = 'success' | 'failed' | 'warning' | 'info';
type LogStatus = 'success' | 'failed';
type ActivityType =
    | 'login'
    | 'logout'
    | 'update'
    | 'create'
    | 'delete'
    | 'export'
    | 'view'
    | 'approve'
    | 'reject';

type ActivityLogRow = {
    id: number;
    page: string; // e.g. "Settings / Profile"
    pageHref?: string | null; // optional
    user: {
        name: string;
        role?: string | null;
    };
    activity: ActivityType;
    description: string | null;
    status: RawLogStatus;
    ip?: string | null;
    device?: string | null;
    timestamp: string; // ISO
};

type DayGroup = {
    dayLabel: string; // e.g. "Today — Jan 12, 2026"
    dayKey: string; // for stable key
    rows: ActivityLogRow[];
};

type ActivityLogProps = {
    logs: ActivityLogRow[];
};

function statusBadgeClass(status: LogStatus) {
    switch (status) {
        case 'success':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';
        case 'failed':
            return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200';
        default:
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';
    }
}

function normalizeStatus(status: RawLogStatus): LogStatus {
    if (status === 'failed') {
        return 'failed';
    }

    return 'success';
}

function activityBadgeClass(type: ActivityType) {
    // subtle but still readable
    switch (type) {
        case 'delete':
        case 'reject':
            return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200';
        case 'approve':
        case 'create':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';
        case 'update':
            return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200';
        case 'export':
            return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200';
        case 'login':
        case 'logout':
        case 'view':
        default:
            return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200';
    }
}

function activityIcon(type: ActivityType) {
    switch (type) {
        case 'approve':
            return <ShieldCheck className="h-3.5 w-3.5" />;
        case 'reject':
            return <ShieldAlert className="h-3.5 w-3.5" />;
        case 'login':
            return <CheckCircle2 className="h-3.5 w-3.5" />;
        case 'logout':
            return <XCircle className="h-3.5 w-3.5" />;
        case 'update':
            return <Clock className="h-3.5 w-3.5" />;
        case 'delete':
            return <TriangleAlert className="h-3.5 w-3.5" />;
        case 'export':
            return <ExternalLink className="h-3.5 w-3.5" />;
        case 'create':
            return <CheckCircle2 className="h-3.5 w-3.5" />;
        case 'view':
        default:
            return <Search className="h-3.5 w-3.5" />;
    }
}

function formatActivity(type: ActivityType) {
    // more readable labels
    const map: Record<ActivityType, string> = {
        login: 'Login',
        logout: 'Logout',
        update: 'Update',
        create: 'Create',
        delete: 'Delete',
        export: 'Export',
        view: 'View',
        approve: 'Approve',
        reject: 'Reject',
    };
    return map[type] ?? type;
}

function dayKeyFromDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateKey = dayKeyFromDate(date);
    const todayKey = dayKeyFromDate(today);
    const yesterdayKey = dayKeyFromDate(yesterday);
    const dateLabel = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    if (dateKey === todayKey) {
        return `Today — ${dateLabel}`;
    }

    if (dateKey === yesterdayKey) {
        return `Yesterday — ${dateLabel}`;
    }

    return dateLabel;
}

function formatTimestamp(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ActivityLog({ logs }: ActivityLogProps) {
    const [query, setQuery] = React.useState('');
    const [status, setStatus] = React.useState<'all' | LogStatus>('all');

    const initialRange = React.useMemo(() => {
        if (!logs.length) {
            const today = dayKeyFromDate(new Date());
            return { from: today, to: today };
        }

        const latest = new Date(logs[0].timestamp);
        const earliest = new Date(logs[logs.length - 1].timestamp);

        return {
            from: dayKeyFromDate(earliest),
            to: dayKeyFromDate(latest),
        };
    }, [logs]);

    const [from, setFrom] = React.useState(() => initialRange.from);
    const [to, setTo] = React.useState(() => initialRange.to);

    const filteredRows = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        const fromKey = from ? from : null;
        const toKey = to ? to : null;

        return logs.filter((row) => {
            const rowDate = new Date(row.timestamp);
            const rowKey = dayKeyFromDate(rowDate);
            const normalizedStatus = normalizeStatus(row.status);
            const matchesStatus =
                status === 'all' ? true : normalizedStatus === status;
            const matchesQuery = !q
                ? true
                : [
                    row.page,
                    row.user.name,
                    row.user.role ?? '',
                    row.description ?? '',
                    row.activity,
                    row.ip ?? '',
                    row.device ?? '',
                    row.timestamp,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(q);

            const matchesDate =
                (!fromKey || rowKey >= fromKey) &&
                (!toKey || rowKey <= toKey);

            return matchesStatus && matchesQuery && matchesDate;
        });
    }, [logs, query, status, from, to]);

    const filteredGroups = React.useMemo(() => {
        const groups = new Map<string, DayGroup>();

        filteredRows.forEach((row) => {
            const rowDate = new Date(row.timestamp);
            const rowKey = dayKeyFromDate(rowDate);
            const group = groups.get(rowKey) ?? {
                dayKey: rowKey,
                dayLabel: formatDayLabel(rowDate),
                rows: [],
            };

            group.rows.push(row);
            groups.set(rowKey, group);
        });

        return Array.from(groups.values());
    }, [filteredRows]);

    const totalRows = React.useMemo(() => filteredRows.length, [filteredRows]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Log" />


             <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="space-y-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <FileClock className="h-5 w-5 text-[#00359c]" />
                                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                    Activity Log
                                </h1>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              View users activity log and history
                            </p>
                        </div>
                    </div>

                </div>

                {/* Filters */}
                <Card className="rounded-2xl border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
                    <div className="grid gap-4">
                        {/* Row 1: From + To */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label className="text-xs text-slate-600 dark:text-slate-300">From</Label>
                                <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                        className="h-9 w-full rounded-xl pl-10"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <Label className="text-xs text-slate-600 dark:text-slate-300">To</Label>
                                <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        className="h-9 w-full rounded-xl pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Status + Search + Reset */}
                        <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                            <div className="grid gap-1.5 sm:col-span-3">
                                <Label className="text-xs text-slate-600 dark:text-slate-300">Status</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                                    <SelectTrigger className="h-9 w-full rounded-xl">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-1.5 sm:col-span-7">
                                <Label className="text-xs text-slate-600 dark:text-slate-300">Search</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search page, user, activity, IP…"
                                        className="h-9 w-full rounded-xl pl-10"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <Label className="sr-only">Reset</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 w-full rounded-xl"
                                    onClick={() => {
                                        setQuery('');
                                        setStatus('all');
                                        setFrom(initialRange.from);
                                        setTo(initialRange.to);
                                    }}
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>


                    <Separator className="my-4" />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="inline-flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{totalRows}</span>
                            <span>result(s)</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">
                                Date range: <span className="font-medium">{from}</span> to{' '}
                                <span className="font-medium">{to}</span>
                            </span>
                        </div>


                    </div>
                </Card>


                {/* Groups per day */}
                <div className="space-y-6">
                    {filteredGroups.length === 0 ? (
                        <Card className="rounded-2xl border-dashed border-slate-200/70 bg-white/70 p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                No activity found
                            </p>
                            <p className="mt-2">
                                Try adjusting your search or filters.
                            </p>
                        </Card>
                    ) : (
                        filteredGroups.map((group) => (
                            <Card
                                key={group.dayKey}
                                className="rounded-2xl border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/40"
                            >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {group.dayLabel}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            {group.rows.length} entr{group.rows.length === 1 ? 'y' : 'ies'}
                                        </p>
                                    </div>

                                    <Badge
                                        className={cn(
                                            'rounded-full border px-2 py-0.5 text-[11px]',
                                            'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
                                        )}
                                    >
                                        {group.dayKey}
                                    </Badge>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10">
                                    <Table className="text-sm">
                                        <TableHeader>
                                            <TableRow className="bg-slate-50/60 dark:bg-white/5">
                                                <TableHead className="w-[26%] py-2 text-xs">
                                                    Page
                                                </TableHead>
                                                <TableHead className="w-[18%] py-2 text-xs">
                                                    User
                                                </TableHead>
                                                <TableHead className="w-[14%] py-2 text-xs">
                                                    Activity
                                                </TableHead>
                                                <TableHead className="py-2 text-xs">
                                                    Description
                                                </TableHead>
                                                <TableHead className="w-[10%] py-2 text-xs">
                                                    Status
                                                </TableHead>
                                                <TableHead className="w-[12%] py-2 text-xs text-right">
                                                    Timestamp
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {group.rows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    className="hover:bg-slate-50/70 dark:hover:bg-white/5"
                                                >
                                                    {/* Page */}
                                                    <TableCell className="py-2 align-top">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    className={cn(
                                                                        'rounded-full border px-2 py-0.5 text-[11px]',
                                                                        'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
                                                                    )}
                                                                >
                                                                    {row.page}
                                                                </Badge>

                                                                {row.pageHref ? (
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                        {row.pageHref}
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            {/* extra micro info */}
                                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                                {row.ip ? (
                                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-white/5">
                                                                        IP: {row.ip}
                                                                    </span>
                                                                ) : null}
                                                                {row.device ? (
                                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-white/5">
                                                                        {row.device}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* User */}
                                                    <TableCell className="py-2 align-top">
                                                        <div className="space-y-1">
                                                            <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                                                                {row.user.name}
                                                            </p>
                                                            {row.user.role ? (
                                                                <Badge
                                                                    className={cn(
                                                                        'rounded-full border px-2 py-0.5 text-[11px]',
                                                                        'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
                                                                    )}
                                                                >
                                                                    {row.user.role}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                    —
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Activity */}
                                                    <TableCell className="py-2 align-top">
                                                        <Badge
                                                            className={cn(
                                                                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]',
                                                                activityBadgeClass(row.activity),
                                                            )}
                                                        >
                                                            {activityIcon(row.activity)}
                                                            {formatActivity(row.activity)}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Description */}
                                                    <TableCell className="py-2 align-top">
                                                        <p className="line-clamp-2 text-[13px] leading-5 text-slate-700 dark:text-slate-200">
                                                            {row.description}
                                                        </p>
                                                    </TableCell>

                                                    {/* Status */}
                                                    <TableCell className="py-2 align-top">
                                                        <Badge
                                                            className={cn(
                                                                'rounded-full border px-2 py-0.5 text-[11px]',
                                                                statusBadgeClass(
                                                                    normalizeStatus(row.status),
                                                                ),
                                                            )}
                                                        >
                                                            {normalizeStatus(row.status) ===
                                                                'success'
                                                                ? 'Success'
                                                                : 'Failed'}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Timestamp */}
                                                    <TableCell className="py-2 align-top text-right">
                                                        <span className="text-xs text-slate-600 dark:text-slate-300">
                                                            {formatTimestamp(row.timestamp)}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

        </AppLayout>
    );
}
