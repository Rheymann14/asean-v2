import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';

import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    BadgeCheck,
    MapPin,
    ExternalLink,
    Building2,
    CheckCircle2,
    XCircle,
    ChevronsUpDown,
    Check,
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
    google_maps_url: string | null; // open link
    embed_url: string | null; // iframe src
    is_active: boolean;
    updated_at?: string | null;

    // optional relation
    programme?: ProgrammeRow | null;
};

type PageProps = {
    programmes?: ProgrammeRow[];
    venues?: VenueRow[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Venue Management', href: '/venue-management' }];

const ENDPOINTS = {
    venues: {
        store: '/venues',
        update: (id: number) => `/venues/${id}`,
        destroy: (id: number) => `/venues/${id}`,
    },
};

const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';

function formatDateTimeSafe(value?: string | null) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium',
                active
                    ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
        >
            {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function EmptyState({
    icon,
    title,
    subtitle,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-950">
            <div className="grid place-items-center gap-2">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {icon}
                </div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</div>
                <div className="max-w-md text-sm text-slate-600 dark:text-slate-400">{subtitle}</div>
                {action ? <div className="mt-4">{action}</div> : null}
            </div>
        </div>
    );
}

function MapPreview({
    embedUrl,
    googleMapsUrl,
}: {
    embedUrl?: string | null;
    googleMapsUrl?: string | null;
}) {
    if (!embedUrl) {
        return (
            <div className="grid h-[320px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-slate-800 dark:bg-slate-900/30">
                <div className="grid place-items-center gap-2 px-6">
                    <MapPin className="h-7 w-7 text-slate-500" />
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">No map embed yet</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Paste an <span className="font-medium">Embed URL</span> to preview the map here.
                    </div>

                    {googleMapsUrl ? (
                        <Button asChild variant="secondary" className="mt-2 rounded-full">
                            <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in Google Maps
                            </a>
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <iframe
                title="Venue map preview"
                src={embedUrl}
                className="h-[320px] w-full pointer-events-none"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute left-3 top-3 h-16 w-52 rounded-lg bg-white/90 shadow-sm dark:bg-slate-900/90"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute right-3 top-3 h-12 w-12 rounded-lg bg-white/90 shadow-sm dark:bg-slate-900/90"
            />
        </div>
    );
}

function showToastError(errors: Record<string, string | string[]>) {
    const firstError = Object.values(errors ?? {})[0];
    const message = Array.isArray(firstError) ? firstError[0] : firstError;
    toast.error(message || 'Something went wrong. Please try again.');
}

function extractIframeSrc(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (!trimmed.includes('<iframe')) return trimmed;
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match?.[1] ?? trimmed;
}

/** ✅ Searchable command combobox for Events */
function EventCombobox({
    programmes,
    value,
    onChange,
    programmesWithVenue,
    editingProgrammeId,
}: {
    programmes: ProgrammeRow[];
    value: string;
    onChange: (v: string) => void;
    programmesWithVenue: Set<number>;
    editingProgrammeId: number | null;
}) {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(() => {
        const id = Number(value);
        if (!value || Number.isNaN(id)) return null;
        return programmes.find((p) => p.id === id) ?? null;
    }, [programmes, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full min-w-0 justify-between"
                >
                    <span className={cn('truncate', !selected && 'text-muted-foreground')}>
                        {selected ? selected.title : 'Select event'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                sideOffset={6}
                collisionPadding={12}
                className="w-[min(var(--radix-popover-trigger-width),36rem)] p-0"
            >
                <Command>
                    <CommandInput placeholder="Search event..." />
                    <CommandList>
                        <CommandEmpty>No event found.</CommandEmpty>

                        <CommandGroup>
                            {programmes.map((p) => {
                                const hasVenue = programmesWithVenue.has(p.id);

                                // ✅ disable if already has venue (but allow current event when editing)
                                const disabled = hasVenue && (editingProgrammeId == null || editingProgrammeId !== p.id);

                                const isSelected = value === String(p.id);

                                return (
                                    <CommandItem
                                        key={p.id}
                                        value={`${p.title} ${p.id}`}
                                        disabled={disabled}
                                        onSelect={() => {
                                            if (disabled) return;
                                            onChange(String(p.id));
                                            setOpen(false);
                                        }}
                                        className={cn(disabled && 'opacity-50')}
                                    >
                                        <div className="flex w-full items-center gap-3">
                                            <Check className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                            <span className="flex-1 truncate">{p.title}</span>

                                            <span
                                                className={cn(
                                                    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                    hasVenue
                                                        ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                        : 'bg-amber-600/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                                                )}
                                            >
                                                {hasVenue ? 'Has venue' : 'No venue yet'}
                                            </span>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function VenueManagement(props: PageProps) {
    const programmes: ProgrammeRow[] = React.useMemo(() => props.programmes ?? [], [props.programmes]);
    const venues: VenueRow[] = React.useMemo(() => props.venues ?? [], [props.venues]);

    const programmeById = React.useMemo(() => new Map(programmes.map((p) => [p.id, p])), [programmes]);

    const resolvedVenues = React.useMemo(() => {
        const toId = (val: unknown): number | null => {
            if (val == null) return null;
            const n = typeof val === 'number' ? val : Number(val);
            return Number.isFinite(n) ? n : null;
        };

        return venues.map((v) => {
            // handle snake_case, camelCase, or missing
            const rawProgrammeId = (v as any).programme_id ?? (v as any).programmeId ?? null;
            const programmeId = toId(rawProgrammeId) ?? toId(v.programme?.id);

            return {
                ...v,
                programme_id: programmeId,
                programme: v.programme ?? (programmeId ? programmeById.get(programmeId) ?? null : null),
            };
        });
    }, [venues, programmeById]);


    // ✅ which programmes already have a venue (used to disable options in Add dialog)
    const programmesWithVenue = React.useMemo(() => {
        const set = new Set<number>();

        for (const v of resolvedVenues) {
            const pid = v.programme_id ?? v.programme?.id;
            if (pid != null) {
                const n = typeof pid === 'number' ? pid : Number(pid);
                if (Number.isFinite(n)) set.add(n);
            }
        }

        return set;
    }, [resolvedVenues]);


    const [q, setQ] = React.useState('');
    const [eventFilter, setEventFilter] = React.useState<string>('all');
    const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all');

    const filtered = React.useMemo(() => {
        const query = q.trim().toLowerCase();
        return resolvedVenues.filter((v) => {
            const matchesQuery =
                !query || `${v.name} ${v.address} ${v.programme?.title ?? ''}`.toLowerCase().includes(query);
            const matchesEvent = eventFilter === 'all' || String(v.programme_id ?? '') === eventFilter;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? v.is_active : !v.is_active);
            return matchesQuery && matchesEvent && matchesStatus;
        });
    }, [resolvedVenues, q, eventFilter, statusFilter]);

    // dialogs
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<VenueRow | null>(null);

    // delete
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<VenueRow | null>(null);

    const form = useForm<{
        programme_id: string;
        name: string;
        address: string;
        google_maps_url: string;
        embed_url: string;
        is_active: boolean;
    }>({
        programme_id: '',
        name: '',
        address: '',
        google_maps_url: '',
        embed_url: '',
        is_active: true,
    });

    const embedPreviewUrl = React.useMemo(() => extractIframeSrc(form.data.embed_url), [form.data.embed_url]);

    function openAdd() {
        setEditing(null);
        form.reset();
        form.setData('is_active', true);
        form.clearErrors();
        setDialogOpen(true);
    }

    function openEdit(item: VenueRow) {
        setEditing(item);
        form.setData({
            programme_id: item.programme_id ? String(item.programme_id) : '',
            name: item.name ?? '',
            address: item.address ?? '',
            google_maps_url: item.google_maps_url ?? '',
            embed_url: item.embed_url ?? '',
            is_active: !!item.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        form.transform((data) => ({
            programme_id: data.programme_id ? Number(data.programme_id) : null,
            name: data.name.trim(),
            address: data.address.trim(),
            google_maps_url: data.google_maps_url.trim() || null,
            embed_url: extractIframeSrc(data.embed_url) || null,
            is_active: !!data.is_active,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                toast.success(`Venue ${editing ? 'updated' : 'created'}.`);
            },
            onError: showToastError,
        } as const;

        if (editing) form.patch(ENDPOINTS.venues.update(editing.id), options);
        else form.post(ENDPOINTS.venues.store, options);
    }

    function toggleActive(item: VenueRow) {
        router.patch(
            ENDPOINTS.venues.update(item.id),
            { is_active: !item.is_active },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Venue ${item.is_active ? 'deactivated' : 'activated'}.`),
                onError: () => toast.error('Unable to update venue status.'),
            },
        );
    }

    function requestDelete(item: VenueRow) {
        setDeleteTarget(item);
        setDeleteOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) return;

        router.delete(ENDPOINTS.venues.destroy(deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
            onSuccess: () => toast.success('Venue deleted.'),
            onError: () => toast.error('Unable to delete venue.'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Venue Management" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* header (no card) */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Venue Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Manage venue details and map location per event.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                            <div className="relative w-full sm:w-[360px]">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search venue, address, event..."
                                    className="pl-9"
                                />
                            </div>

                            <Select value={eventFilter} onValueChange={setEventFilter}>
                                <SelectTrigger className="w-full sm:w-[240px]">
                                    <SelectValue placeholder="Filter by event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Events</SelectItem>
                                    {programmes.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                                <SelectTrigger className="w-full sm:w-[170px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={openAdd} className={cn('w-full sm:w-auto', PRIMARY_BTN)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Venue
                        </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Showing{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{filtered.length}</span> item
                        {filtered.length === 1 ? '' : 's'}
                    </div>

                    <div className="mt-4">
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={<Building2 className="h-5 w-5" />}
                                title="No venues found"
                                subtitle="Try adjusting your search/filters, or add a new venue."
                            />
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                            <TableHead className="min-w-[260px]">Venue</TableHead>
                                            <TableHead className="min-w-[260px]">Event</TableHead>
                                            <TableHead className="min-w-[340px]">Address</TableHead>
                                            <TableHead className="w-[140px]">Status</TableHead>
                                            <TableHead className="w-[180px]">Updated</TableHead>
                                            <TableHead className="w-[120px] text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {filtered.map((v) => (
                                            <TableRow key={v.id}>
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-500" />
                                                        <span className="truncate">{v.name}</span>
                                                    </div>

                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        {v.google_maps_url ? (
                                                            <a
                                                                href={v.google_maps_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-[#00359c] hover:underline"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                                Google Maps
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">No Google Maps link</span>
                                                        )}

                                                        {v.embed_url ? (
                                                            <span className="text-xs text-slate-400">• Embed ready</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">• No embed</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-slate-700 dark:text-slate-300">
                                                    {v.programme?.title ?? '—'}
                                                </TableCell>

                                                <TableCell className="text-slate-700 dark:text-slate-300">
                                                    <div className="line-clamp-2">{v.address}</div>
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge active={v.is_active} />
                                                </TableCell>

                                                <TableCell className="text-slate-700 dark:text-slate-300">
                                                    {formatDateTimeSafe(v.updated_at)}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>

                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => openEdit(v)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => toggleActive(v)}>
                                                                <BadgeCheck className="mr-2 h-4 w-4" />
                                                                {v.is_active ? 'Set Inactive' : 'Set Active'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => requestDelete(v)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[980px]">

                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Venue' : 'Add Venue'}</DialogTitle>
                        <DialogDescription>
                            Set venue details for a specific event, including Google Maps link and Embed URL.
                          
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
                            {/* LEFT FORM */}
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Event  <span className="text-[11px] font-semibold text-red-600"> *</span></div>

                                        {programmes?.length ? (
                                            <EventCombobox
                                                programmes={programmes}
                                                value={form.data.programme_id}
                                                onChange={(v) => form.setData('programme_id', v)}
                                                programmesWithVenue={programmesWithVenue}
                                                editingProgrammeId={editing?.programme_id ?? null}
                                            />
                                        ) : (
                                            <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                                                No record found, try adding events first.
                                            </div>
                                        )}

                                        {form.errors.programme_id ? (
                                            <div className="text-xs text-red-600">{form.errors.programme_id}</div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Venue name <span className="text-[11px] font-semibold text-red-600"> *</span></div>
                                        <Input
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder="e.g. Commission on Higher Education (CHED)"
                                        />
                                        {form.errors.name ? <div className="text-xs text-red-600">{form.errors.name}</div> : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Address</div>
                                        <Textarea
                                            value={form.data.address}
                                            onChange={(e) => form.setData('address', e.target.value)}
                                            placeholder="Full address shown on the public Venue page"
                                            className="min-h-[90px]"
                                        />
                                        {form.errors.address ? <div className="text-xs text-red-600">{form.errors.address}</div> : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Google Maps link (Open in Google Maps button)</div>
                                        <Input
                                            value={form.data.google_maps_url}
                                            onChange={(e) => form.setData('google_maps_url', e.target.value)}
                                            placeholder="https://maps.google.com/?q=... or share link"
                                        />
                                        {form.errors.google_maps_url ? (
                                            <div className="text-xs text-red-600">{form.errors.google_maps_url}</div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Embed URL (iframe src)</div>
                                        <Input
                                            value={form.data.embed_url}
                                            onChange={(e) => form.setData('embed_url', e.target.value)}
                                            placeholder="https://www.google.com/maps/embed?pb=..."
                                        />
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Tip: In Google Maps → Share → <span className="font-medium">Embed a map</span> → copy the iframe
                                            src URL.
                                        </div>
                                        {form.errors.embed_url ? <div className="text-xs text-red-600">{form.errors.embed_url}</div> : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Status</div>
                                        <Select
                                            value={form.data.is_active ? 'active' : 'inactive'}
                                            onValueChange={(v) => form.setData('is_active', v === 'active')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Inactive venues won’t show on public pages.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PREVIEW */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Map Preview</div>
                                    {form.data.google_maps_url ? (
                                        <Button asChild variant="secondary" className="rounded-full">
                                            <a href={form.data.google_maps_url} target="_blank" rel="noreferrer">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open in Google Maps
                                            </a>
                                        </Button>
                                    ) : null}
                                </div>

                                <MapPreview embedUrl={embedPreviewUrl} googleMapsUrl={form.data.google_maps_url} />

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200">
                                    <div className="font-semibold">Public page will show</div>
                                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-300">
                                        <li>Venue name + address</li>
                                        <li>Map embed (if allowed by browser/adblock)</li>
                                        <li>“Open in Google Maps” button from your link</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={form.processing}>
                                Cancel
                            </Button>
                            <Button type="submit" className={PRIMARY_BTN} disabled={form.processing}>
                                {editing ? 'Save changes' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this venue?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {deleteTarget?.name ?? 'this venue'}
                            </span>
                            . This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
