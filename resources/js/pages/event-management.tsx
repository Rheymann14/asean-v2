import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { cn, toDateOnlyTimestamp } from '@/lib/utils';

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

import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    BadgeCheck,
    CalendarDays,
    ImageUp,
    FileText,
    XCircle,
    CheckCircle2,
} from 'lucide-react';

type ProgrammeParticipant = {
    id: number;
    name: string;
    email?: string | null;
    display_id?: string | null;
    checked_in_at?: string | null;
};

type ProgrammeRow = {
    id: number;
    title: string;
    description: string;
    created_by?: {
        name: string;
    } | null;

    starts_at: string | null; // ISO string
    ends_at: string | null; // ISO string
    location?: string | null;
    venue?: {
        name: string;
        address?: string | null;
    } | null;

    image_url: string | null; // server-provided
    pdf_url: string | null; // server-provided (for "View more")
    materials?: {
        id: number;
        file_name: string;
        file_path: string;
        file_type: string | null;
    }[];
    signatory_name?: string | null;
    signatory_title?: string | null;
    signatory_signature_url?: string | null;

    is_active: boolean;
    updated_at?: string | null;
    participants?: ProgrammeParticipant[];
};

type PageProps = {
    programmes?: ProgrammeRow[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Event Management', href: '/event-management' }];

const ENDPOINTS = {
    programmes: {
        store: '/programmes',
        update: (id: number) => `/programmes/${id}`,
        destroy: (id: number) => `/programmes/${id}`,
    },
};

const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';

// -------------------- helpers --------------------
function formatDatePill(starts_at?: string | null, ends_at?: string | null) {
    if (!starts_at) return '—';
    const s = new Date(starts_at);
    const e = ends_at ? new Date(ends_at) : null;
    if (Number.isNaN(s.getTime())) return '—';

    const d = new Intl.DateTimeFormat('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }).format(s);
    const time = (dt: Date) => new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(dt);

    if (!e || Number.isNaN(e.getTime())) return `${d} · ${time(s)}`;
    return `${d} · ${time(s)}–${time(e)}`;
}

function daysToGo(starts_at?: string | null) {
    if (!starts_at) return null;
    const s = new Date(starts_at);
    if (Number.isNaN(s.getTime())) return null;

    const now = new Date();
    const diff = s.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day to go';
    return `${days} days to go`;
}

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

function toLocalInputValue(iso: string | null | undefined) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function basename(u: string) {
    const s = u.split('?')[0].split('#')[0];
    const parts = s.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? u;
}

function resolvePdfUrl(pdfUrl?: string | null) {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith('http') || pdfUrl.startsWith('/')) return pdfUrl;
    const normalized = pdfUrl.replace(/^\.?\/?downloadables\//i, '');
    return `/downloadables/${normalized}`;
}

function resolveImageUrl(imageUrl?: string | null) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
    return `/event-images/${imageUrl}`;
}

function getEventStatus(starts_at?: string | null, ends_at?: string | null) {
    if (!starts_at) return 'upcoming';
    const start = new Date(starts_at);
    if (Number.isNaN(start.getTime())) return 'upcoming';

    const end = ends_at ? new Date(ends_at) : null;
    const now = new Date();
    const nowDateTs = toDateOnlyTimestamp(now);
    const startDateTs = toDateOnlyTimestamp(start);
    const endDateTs = end && !Number.isNaN(end.getTime()) ? toDateOnlyTimestamp(end) : null;

    if (endDateTs !== null && nowDateTs > endDateTs) return 'closed';
    if (nowDateTs < startDateTs) return 'upcoming';
    return 'ongoing';
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

function EventStatusBadge({ status }: { status: 'upcoming' | 'ongoing' | 'closed' }) {
    const styles = {
        upcoming: 'bg-sky-600/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
        ongoing: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    } as const;

    const labels = {
        upcoming: 'Upcoming',
        ongoing: 'Ongoing',
        closed: 'Closed',
    } as const;

    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium', styles[status])}>{labels[status]}</span>;
}

function showToastError(errors: Record<string, string | string[]>) {
    const firstError = Object.values(errors ?? {})[0];
    const message = Array.isArray(firstError) ? firstError[0] : firstError;
    toast.error(message || 'Something went wrong. Please try again.');
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

export default function EventManagement(props: PageProps) {
    const serverProgrammes: ProgrammeRow[] = props.programmes ?? [];

    const programmes: ProgrammeRow[] = React.useMemo(() => serverProgrammes, [serverProgrammes]);

    // filters
    const [q, setQ] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all');
    const [eventFilter, setEventFilter] = React.useState<'all' | 'upcoming' | 'ongoing' | 'closed'>('all');

    const filtered = React.useMemo(() => {
        const query = q.trim().toLowerCase();
        return programmes.filter((p) => {
            const createdBy = p.created_by?.name ?? '';
            const matchesQuery = !query || `${p.title} ${p.description} ${createdBy}`.toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.is_active : !p.is_active);
            const phase = getEventStatus(p.starts_at, p.ends_at);
            const matchesEvent = eventFilter === 'all' || phase === eventFilter;
            return matchesQuery && matchesStatus && matchesEvent;
        });
    }, [programmes, q, statusFilter, eventFilter]);

    // dialogs + editing
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<ProgrammeRow | null>(null);

    // delete
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ProgrammeRow | null>(null);

    type MaterialRow = NonNullable<ProgrammeRow['materials']>[number];

    const [existingMaterials, setExistingMaterials] = React.useState<MaterialRow[]>([]);
    const [removedMaterials, setRemovedMaterials] = React.useState<MaterialRow[]>([]);
    const [removedMaterialIds, setRemovedMaterialIds] = React.useState<number[]>([]);

    // new uploads (client)
    const [materialsFiles, setMaterialsFiles] = React.useState<File[]>([]);

    function resolveMaterialUrl(path: string) {
        if (!path) return '#';
        if (path.startsWith('http') || path.startsWith('/')) return path;
        // typical Laravel Storage::url() stores "folder/file.ext" -> /storage/folder/file.ext
        return `/storage/${path}`;
    }


    // ✅ existing file urls (server) when editing
    const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(null);
    const [currentPdfUrl, setCurrentPdfUrl] = React.useState<string | null>(null);

    // image preview
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);

    // pdf label
    const [pdfLabel, setPdfLabel] = React.useState<string>('');
    const [materialsLabel, setMaterialsLabel] = React.useState<string>('');

    React.useEffect(() => {
        return () => {
            if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);



    const form = useForm<{
        title: string;
        description: string;
        starts_at: string; // datetime-local
        ends_at: string; // datetime-local
        image: File | null;
        pdf: File | null;
        materials: File[];
        is_active: boolean;
    }>({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        image: null,
        pdf: null,
        materials: [],
        is_active: true,
    });

    function resetImagePreview(next: string | null) {
        setImagePreview((prev) => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return next;
        });
    }

    function openAdd() {
        setEditing(null);
        form.reset();
        form.clearErrors();

        setCurrentImageUrl(null);
        setCurrentPdfUrl(null);

        resetImagePreview(null);
        setPdfLabel('');
        setMaterialsLabel('');

        setExistingMaterials([]);
        setRemovedMaterials([]);
        setRemovedMaterialIds([]);
        setMaterialsFiles([]);
        form.setData('materials', []);
        setMaterialsLabel('');

        setDialogOpen(true);
    }

    function openEdit(item: ProgrammeRow) {
        setEditing(item);

        setCurrentImageUrl(resolveImageUrl(item.image_url));
        setCurrentPdfUrl(resolvePdfUrl(item.pdf_url));

        setExistingMaterials(item.materials ?? []);
        setRemovedMaterials([]);
        setRemovedMaterialIds([]);
        setMaterialsFiles([]);
        form.setData('materials', []);
        setMaterialsLabel('');

        form.setData({
            title: item.title ?? '',
            description: item.description ?? '',
            starts_at: toLocalInputValue(item.starts_at),
            ends_at: toLocalInputValue(item.ends_at),
            image: null,
            pdf: null,
            materials: [],
            is_active: !!item.is_active,
        });

        form.clearErrors();

        // show existing as "preview" until new upload
        resetImagePreview(resolveImageUrl(item.image_url));
        setPdfLabel(item.pdf_url ? basename(resolvePdfUrl(item.pdf_url) ?? item.pdf_url) : '');
        setMaterialsLabel('');

        setDialogOpen(true);
    }

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('image', file);

        if (!file) {
            resetImagePreview(currentImageUrl);
            return;
        }

        resetImagePreview(URL.createObjectURL(file));
    }

    function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('pdf', file);

        if (!file) {
            setPdfLabel(currentPdfUrl ? basename(currentPdfUrl) : '');
            return;
        }

        setPdfLabel(file.name);
    }

    function handleMaterialsUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? []);
        if (!picked.length) return;

        const keyOf = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

        setMaterialsFiles((prev) => {
            const existingKeys = new Set(prev.map(keyOf));
            const next = [...prev];
            for (const f of picked) {
                const k = keyOf(f);
                if (!existingKeys.has(k)) next.push(f);
            }

            form.setData('materials', next);
            setMaterialsLabel(next.length ? `${next.length} file(s) selected` : '');
            return next;
        });

        // allow selecting the same file again later
        e.currentTarget.value = '';
    }


    function submit(e: React.FormEvent) {
        e.preventDefault();

        const hasUploads = Boolean(form.data.image || form.data.pdf || form.data.materials.length);
        form.transform((data) => {
            const payload: any = {
                title: data.title.trim(),
                description: data.description.trim(),
                starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : null,
                ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
                is_active: editing ? !!editing.is_active : !!data.is_active,
            };

            // only send if selected (so editing won't overwrite existing files)
            if (data.image) payload.image = data.image;
            if (data.pdf) payload.pdf = data.pdf;
            if (data.materials.length) payload.materials = data.materials;
            if (removedMaterialIds.length) payload.materials_remove = removedMaterialIds;
            if (editing) payload._method = 'patch';

            return payload;
        });

        const options = {
            preserveScroll: true,
            forceFormData: hasUploads,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                toast.success(`Event ${editing ? 'updated' : 'created'}.`);
            },
            onError: (errors: Record<string, string | string[]>) => showToastError(errors),
        } as const;

        if (editing) form.post(ENDPOINTS.programmes.update(editing.id), options);
        else form.post(ENDPOINTS.programmes.store, options);
    }

    function toggleActive(item: ProgrammeRow) {
        router.patch(
            ENDPOINTS.programmes.update(item.id),
            { is_active: !item.is_active },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Event ${item.is_active ? 'deactivated' : 'activated'}.`),
                onError: () => toast.error('Unable to update event status.'),
            },
        );
    }

    function requestDelete(item: ProgrammeRow) {
        setDeleteTarget(item);
        setDeleteOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) return;

        router.delete(ENDPOINTS.programmes.destroy(deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
            onSuccess: () => toast.success('Event deleted.'),
            onError: () => toast.error('Unable to delete event.'),
        });
    }

    function openParticipants(item: ProgrammeRow) {
        router.get(`/event-management/${item.id}/participants`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Event Management" />

            {/* ✅ removed overflow-x-auto here */}
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* header */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Event Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Manage event cards shown on the public Event page.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                            <div className="relative w-full sm:w-[360px]">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search title or description..."
                                    className="pl-9"
                                />
                            </div>

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

                            <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as any)}>
                                <SelectTrigger className="w-full sm:w-[190px]">
                                    <SelectValue placeholder="Event phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All phases</SelectItem>
                                    <SelectItem value="ongoing">Ongoing</SelectItem>
                                    <SelectItem value="upcoming">Upcoming</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={openAdd} className={cn('w-full sm:w-auto', PRIMARY_BTN)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Event
                        </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{filtered.length}</span>{' '}
                        item{filtered.length === 1 ? '' : 's'}
                    </div>

                    <div className="mt-4">
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={<CalendarDays className="h-5 w-5" />}
                                title="No event items found"
                                subtitle="Try adjusting your search/filter, or add a new event item."
                            />
                        ) : (
                            // ✅ scrollbar only in table area
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                                <Table className="min-w-[1480px]">
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                            <TableHead className="min-w-[360px]">Event</TableHead>

                                            <TableHead className="min-w-[260px]">Schedule</TableHead>
                                            <TableHead className="min-w-[220px]">View more (PDF)</TableHead>
                                            <TableHead className="w-[160px]">Event Status</TableHead>
                                            <TableHead className="w-[140px]">Status</TableHead>
                                            <TableHead className="w-[200px]">Participants</TableHead>
                                            <TableHead className="w-[180px]">Updated</TableHead>
                                            <TableHead className="w-[120px] text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {filtered.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="grid size-10 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                            {(() => {
                                                                const imageUrl = resolveImageUrl(p.image_url);
                                                                if (!imageUrl) {
                                                                    return <ImageUp className="h-4 w-4 text-slate-500" />;
                                                                }

                                                                return (
                                                                    <img
                                                                        src={imageUrl}
                                                                        alt={p.title}
                                                                        className="h-full w-full object-cover"
                                                                        loading="lazy"
                                                                        draggable={false}
                                                                    />
                                                                );
                                                            })()}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="truncate">{p.title}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>



                                                <TableCell className="text-slate-700 dark:text-slate-300">
                                                    <div className="font-medium">{formatDatePill(p.starts_at, p.ends_at)}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{daysToGo(p.starts_at) ?? '—'}</div>
                                                </TableCell>

                                                <TableCell className="text-slate-700 dark:text-slate-300">
                                                    {(() => {
                                                        const pdfUrl = resolvePdfUrl(p.pdf_url);
                                                        if (!pdfUrl) {
                                                            return <span className="text-xs text-slate-500 dark:text-slate-400">—</span>;
                                                        }

                                                        return (
                                                            <a
                                                                href={pdfUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#00359c] hover:text-[#00359c] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                                            >
                                                                <FileText className="h-4 w-4 text-[#00359c]" />
                                                                <span className="max-w-[260px] truncate">{basename(pdfUrl)}</span>
                                                            </a>
                                                        );
                                                    })()}
                                                </TableCell>

                                                <TableCell>
                                                    <EventStatusBadge status={getEventStatus(p.starts_at, p.ends_at)} />
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge active={p.is_active} />
                                                </TableCell>

                                                <TableCell>
                                                    <button
                                                        type="button"
                                                        onClick={() => openParticipants(p)}
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#00359c]/20 bg-[#00359c]/5 px-3 py-1 text-sm font-semibold text-[#00359c] shadow-sm hover:bg-[#00359c]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00359c]/30"
                                                    >
                                                        {(p.participants?.length ?? 0).toLocaleString()} joined
                                                        <span className="text-xs font-medium opacity-70">View</span>
                                                    </button>
                                                </TableCell>


                                                <TableCell className="text-slate-700 dark:text-slate-300">{formatDateTimeSafe(p.updated_at)}</TableCell>

                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>

                                                        <DropdownMenuContent align="end" className="w-52">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onSelect={() => openEdit(p)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => toggleActive(p)}>
                                                                <BadgeCheck className="mr-2 h-4 w-4" />
                                                                {p.is_active ? 'Set Inactive' : 'Set Active'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => requestDelete(p)}>
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

            {/* Add/Edit Dialog (NO live preview, NO URL inputs) */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className={cn('w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[760px]', 'max-h-[85vh] overflow-hidden p-0')}>
                    <form onSubmit={submit} className="flex max-h-[85vh] flex-col">
                        <div className="px-6 pt-6">
                            <DialogHeader>
                                <DialogTitle>{editing ? 'Edit Event' : 'Add Event'}</DialogTitle>
                                <DialogDescription>Upload image + PDF for “View more” on the public page.</DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="mt-4 grid gap-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Title</div>
                                        <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="e.g. Track Discussions" />
                                        {form.errors.title ? <div className="text-xs text-red-600">{form.errors.title}</div> : null}
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Description</div>
                                        <Textarea
                                            value={form.data.description}
                                            onChange={(e) => form.setData('description', e.target.value)}
                                            placeholder="Short description shown on the card"
                                            className="min-h-[96px]"
                                        />
                                        {form.errors.description ? <div className="text-xs text-red-600">{form.errors.description}</div> : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="text-sm font-medium">Starts at</div>
                                        <Input type="datetime-local" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} />
                                        {form.errors.starts_at ? <div className="text-xs text-red-600">{form.errors.starts_at}</div> : null}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="text-sm font-medium">Ends at</div>
                                        <Input type="datetime-local" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} />
                                        {form.errors.ends_at ? <div className="text-xs text-red-600">{form.errors.ends_at}</div> : null}
                                    </div>

                                    {/* IMAGE (upload only) */}
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">Image</div>

                                        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                                            <div className="space-y-2">
                                                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                                                {(form.errors as any).image ? <div className="text-xs text-red-600">{(form.errors as any).image}</div> : null}

                                                {currentImageUrl && !form.data.image ? (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Current: <span className="font-semibold">{basename(currentImageUrl)}</span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                <div className="aspect-square bg-slate-100 dark:bg-slate-900">
                                                    {imagePreview ? (
                                                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" draggable={false} />
                                                    ) : (
                                                        <div className="grid h-full place-items-center text-xs text-slate-500">No image</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PDF (upload only) */}
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <div className="text-sm font-medium">PDF (View more)</div>

                                        <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
                                            <div className="space-y-2">
                                                <Input type="file" accept="application/pdf" onChange={handlePdfUpload} />
                                                {(form.errors as any).pdf ? <div className="text-xs text-red-600">{(form.errors as any).pdf}</div> : null}

                                                {currentPdfUrl && !form.data.pdf ? (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        Current: <span className="font-semibold">{basename(currentPdfUrl)}</span>
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Selected</div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {pdfLabel || 'No PDF selected'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">Opens when users click “View more”.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MATERIALS (upload only) */}
                                    <div className="space-y-2 sm:col-span-2">
                                        <div className="text-sm font-medium">Event kit materials</div>

                                        <Input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            onChange={handleMaterialsUpload}
                                        />

                                        {(form.errors as any).materials ? (
                                            <div className="text-xs text-red-600">{(form.errors as any).materials}</div>
                                        ) : null}

                                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span>Files</span>
                                                </div>

                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {(editing ? existingMaterials.length : 0).toLocaleString()} current
                                                    {materialsFiles.length ? ` · ${materialsFiles.length} new` : ''}
                                                </div>
                                            </div>

                                            {/* Existing (server) materials when editing */}
                                            {editing ? (
                                                <div className="mt-2 space-y-1.5">
                                                    {existingMaterials.length ? (
                                                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                            Existing uploads
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">No existing materials.</div>
                                                    )}

                                                    {existingMaterials.map((m) => {
                                                        const href = resolveMaterialUrl(m.file_path);
                                                        return (
                                                            <div
                                                                key={m.id}
                                                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-800"
                                                            >
                                                                <div className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                </div>

                                                                <a
                                                                    href={href}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:underline dark:text-slate-100"
                                                                    title={m.file_name}
                                                                >
                                                                    {m.file_name}
                                                                </a>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                                                    onClick={() => {
                                                                        // move to "removed" (undo-able)
                                                                        setExistingMaterials((prev) => prev.filter((x) => x.id !== m.id));
                                                                        setRemovedMaterials((prev) => [m, ...prev]);
                                                                        setRemovedMaterialIds((prev) => (prev.includes(m.id) ? prev : [...prev, m.id]));
                                                                    }}
                                                                >
                                                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Removed list (undo) */}
                                                    {removedMaterials.length ? (
                                                        <div className="mt-3 space-y-1.5">
                                                            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                                                Removed (will delete on Save)
                                                            </div>

                                                            {removedMaterials.map((m) => (
                                                                <div
                                                                    key={`removed-${m.id}`}
                                                                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
                                                                >
                                                                    <div className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">
                                                                        {m.file_name}
                                                                    </div>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs"
                                                                        onClick={() => {
                                                                            // undo remove
                                                                            setRemovedMaterials((prev) => prev.filter((x) => x.id !== m.id));
                                                                            setExistingMaterials((prev) => [m, ...prev]);
                                                                            setRemovedMaterialIds((prev) => prev.filter((id) => id !== m.id));
                                                                        }}
                                                                    >
                                                                        Undo
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {/* New uploads (client) */}
                                            <div className={cn('mt-3 space-y-1.5', editing ? '' : 'mt-2')}>
                                                {materialsFiles.length ? (
                                                    <>
                                                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">New uploads</div>
                                                        {materialsFiles.map((f, idx) => (
                                                            <div
                                                                key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
                                                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-800"
                                                            >
                                                                <div className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                    <div className="truncate font-medium text-slate-900 dark:text-slate-100">{f.name}</div>
                                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                        {(f.size / 1024).toFixed(0)} KB
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                                                    onClick={() => {
                                                                        setMaterialsFiles((prev) => {
                                                                            const next = prev.filter((_, i) => i !== idx);
                                                                            form.setData('materials', next);
                                                                            setMaterialsLabel(next.length ? `${next.length} file(s) selected` : '');
                                                                            return next;
                                                                        });
                                                                    }}
                                                                >
                                                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">No new files selected.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/85 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={form.processing}>
                                    Cancel
                                </Button>
                                <Button type="submit" className={PRIMARY_BTN} disabled={form.processing}>
                                    {editing ? 'Save changes' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{' '}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteTarget?.title ?? 'this item'}</span>.
                            This action cannot be undone.
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
