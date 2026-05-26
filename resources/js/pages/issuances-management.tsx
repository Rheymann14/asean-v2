import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    FileText,
    ExternalLink,
    Download,
    ScrollText,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type Issuance = {
    id: number;
    title: string;
    issued_at: string; // YYYY-MM-DD
    pdf_url: string; // e.g. /storage/issuances/xxx.pdf
    is_active: boolean;
    created_at?: string | null;
    updated_at?: string | null;
};

type PageProps = {
    issuances?: Issuance[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Issuances Management',
        href: '/issuances-management', // change if needed
    },
];

const ENDPOINTS = {
    store: '/issuances',
    update: (id: number) => `/issuances/${id}`,
    destroy: (id: number) => `/issuances/${id}`,
};

const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
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

function showToastError(errors: Record<string, string | string[]>) {
    const firstError = Object.values(errors)?.[0];
    const message = Array.isArray(firstError) ? firstError[0] : firstError;
    toast.error(message || 'Something went wrong. Please try again.');
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <Badge
            variant={active ? 'default' : 'secondary'}
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px]',
                active
                    ? 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            )}
        >
            {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {active ? 'Active' : 'Inactive'}
        </Badge>
    );
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
                'bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200 dark:from-slate-900 dark:to-slate-950 dark:ring-slate-800',
                'shadow-[0_18px_50px_-40px_rgba(2,6,23,0.35)]',
            )}
            aria-hidden
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,rgba(255,255,255,0.9),transparent_55%)] dark:bg-[radial-gradient(120%_90%_at_20%_10%,rgba(255,255,255,0.12),transparent_55%)]" />

            {inView ? (
                <iframe
                    title={`${title} preview`}
                    src={`${href}#page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0`}
                    className={cn('pointer-events-none absolute inset-0 bg-white', 'h-[140%] w-[140%] origin-top-left scale-[0.72]')}
                    loading="lazy"
                />
            ) : (
                <div className="grid h-full w-full place-items-center">
                    <FileText className="h-7 w-7 text-slate-400" />
                </div>
            )}

            <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-3 bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-900" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent dark:from-slate-950" />
        </div>
    );
}

export default function IssuancesManagement(props: PageProps) {
    const issuances = props.issuances ?? [];

    const [view, setView] = React.useState<'grid' | 'table'>('grid');
    const [q, setQ] = React.useState('');
    const [status, setStatus] = React.useState<'all' | 'active' | 'inactive'>('all');

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Issuance | null>(null);

    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<Issuance | null>(null);

    const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);
    React.useEffect(() => {
        return () => {
            if (pdfPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    const form = useForm<{
        title: string;
        issued_at: string;
        pdf: File | null;
    }>({
        title: '',
        issued_at: '',
        pdf: null,
    });

    const filtered = React.useMemo(() => {
        const query = q.trim().toLowerCase();
        return issuances
            .filter((x) => {
                const matchesQuery = !query || `${x.title} ${x.issued_at}`.toLowerCase().includes(query);
                const matchesStatus = status === 'all' || (status === 'active' ? x.is_active : !x.is_active);
                return matchesQuery && matchesStatus;
            })
            .sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1));
    }, [issuances, q, status]);

    function openAdd() {
        setEditing(null);
        form.reset();
        form.clearErrors();
        if (pdfPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
        setDialogOpen(true);
    }

    function openEdit(item: Issuance) {
        setEditing(item);
        form.setData({
            title: item.title ?? '',
            issued_at: item.issued_at ?? '',
            pdf: null,
        });
        form.clearErrors();
        if (pdfPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(item.pdf_url ?? null);
        setDialogOpen(true);
    }

    function onPickPdf(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        form.setData('pdf', file);

        if (pdfPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfPreviewUrl);

        if (!file) {
            setPdfPreviewUrl(editing?.pdf_url ?? null);
            return;
        }
        setPdfPreviewUrl(URL.createObjectURL(file));
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        form.transform((data) => {
            const payload: any = {
                title: data.title.trim(),
                issued_at: data.issued_at,
            };
            if (data.pdf) payload.pdf = data.pdf;
            return payload;
        });

        const options = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                toast.success(`Issuance ${editing ? 'updated' : 'created'}.`);
            },
            onError: showToastError,
        } as const;

        if (editing) form.patch(ENDPOINTS.update(editing.id), options);
        else form.post(ENDPOINTS.store, options);
    }

    function toggleActive(item: Issuance) {
        router.patch(
            ENDPOINTS.update(item.id),
            { is_active: !item.is_active },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Issuance ${item.is_active ? 'deactivated' : 'activated'}.`),
                onError: () => toast.error('Unable to update issuance status.'),
            },
        );
    }

    function requestDelete(item: Issuance) {
        setDeleteTarget(item);
        setDeleteOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) return;

        router.delete(ENDPOINTS.destroy(deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
            onSuccess: () => toast.success('Issuance deleted.'),
            onError: () => toast.error('Unable to delete issuance.'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Issuances Management" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* NO CARD HEADER */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Issuances Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Upload PDF issuances, edit details, and set Active/Inactive.
                    </p>
                </div>

                {/* ✅ Tabs WRAPPER (fixes your error) */}
                <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                                <div className="relative w-full sm:w-[360px]">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Search issuance (title, date)..."
                                        className="pl-9"
                                    />
                                </div>

                                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
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

                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                                <TabsList className="w-full sm:w-auto">
                                    <TabsTrigger value="grid">Grid</TabsTrigger>
                                    <TabsTrigger value="table">Table</TabsTrigger>
                                </TabsList>

                                <Button onClick={openAdd} className={cn('w-full sm:w-auto', PRIMARY_BTN)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Issuance
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{filtered.length}</span>{' '}
                            item{filtered.length === 1 ? '' : 's'}
                        </div>

                        {/* ---------------- GRID ---------------- */}
                        <TabsContent value="grid" className="mt-0">
                            {filtered.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/30">
                                    <FileText className="mx-auto h-7 w-7 text-slate-400" />
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No issuances found.</p>
                                    <p className="mt-1 text-sm text-slate-500">Try another keyword.</p>
                                </div>
                            ) : (
                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filtered.map((item) => (
                                        <div key={item.id} className="group">
                                            <div className="relative">
                                                <a
                                                    href={item.pdf_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00359c]/30"
                                                >
                                                    <PdfThumb href={item.pdf_url} title={item.title} />
                                                </a>

                                                <div className="absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-slate-950/50 via-slate-950/10 to-transparent" />
                                                    <div className="absolute left-3 top-3">
                                                        <StatusBadge active={item.is_active} />
                                                    </div>

                                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            className={cn('h-8 w-8 rounded-full', PRIMARY_BTN)}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                openEdit(item);
                                                            }}
                                                            title="Edit"
                                                            aria-label="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>

                                                        <div className="flex items-center gap-2">
                                                            <Button asChild size="icon" variant="secondary" className="h-8 w-8 rounded-full" title="Download">
                                                                <a href={item.pdf_url} download aria-label="Download">
                                                                    <Download className="h-4 w-4" />
                                                                </a>
                                                            </Button>

                                                            <Button asChild size="icon" variant="secondary" className="h-8 w-8 rounded-full" title="Open">
                                                                <a href={item.pdf_url} target="_blank" rel="noreferrer" aria-label="Open">
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-medium text-slate-500">{formatDate(item.issued_at)}</span>
                                                </div>

                                                <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {item.title}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* ---------------- TABLE ---------------- */}
                        <TabsContent value="table" className="mt-0">
                            {filtered.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/30">
                                    <FileText className="mx-auto h-7 w-7 text-slate-400" />
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No issuances found.</p>
                                    <p className="mt-1 text-sm text-slate-500">Try another keyword.</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-900/40">
                                                <TableHead>Title</TableHead>
                                                <TableHead className="w-[150px]">Issued</TableHead>
                                                <TableHead className="w-[140px]">Status</TableHead>
                                                <TableHead className="w-[170px]">Updated</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {filtered.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="min-w-[320px]">
                                                        <div className="flex items-start gap-3">
                                                            <div className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                                                                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                                                    {item.title}
                                                                </div>
                                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                    <a
                                                                        href={item.pdf_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 text-xs font-medium text-[#00359c] hover:underline"
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                        Open PDF
                                                                    </a>
                                                                    <span className="text-xs text-slate-400">•</span>
                                                                    <a
                                                                        href={item.pdf_url}
                                                                        download
                                                                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        Download
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(item.issued_at)}</TableCell>

                                                    <TableCell>
                                                        <StatusBadge active={item.is_active} />
                                                    </TableCell>

                                                    <TableCell className="text-slate-700 dark:text-slate-300">
                                                        {formatDateTimeSafe(item.updated_at ?? item.created_at)}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>

                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => openEdit(item)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => toggleActive(item)}>
                                                                    <BadgeCheck className="mr-2 h-4 w-4" />
                                                                    {item.is_active ? 'Set Inactive' : 'Set Active'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => requestDelete(item)}>
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
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* -------------------- Add/Edit Dialog -------------------- */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Issuance' : 'Add Issuance'}</DialogTitle>
                        <DialogDescription>Upload a PDF and set issuance details. You can replace the PDF anytime.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <div className="text-sm font-medium">Title</div>
                                <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="e.g. CHED Memo No. 01" />
                                {form.errors.title ? <div className="text-xs text-red-600">{form.errors.title}</div> : null}
                            </div>

                            <div className="space-y-1.5">
                                <div className="text-sm font-medium">Issued date</div>
                                <Input type="date" value={form.data.issued_at} onChange={(e) => form.setData('issued_at', e.target.value)} />
                                {form.errors.issued_at ? <div className="text-xs text-red-600">{form.errors.issued_at}</div> : null}
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">PDF File</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">PDF only • required on create</div>
                                </div>

                                <Input type="file" accept="application/pdf" onChange={onPickPdf} />
                                {(form.errors as any).pdf ? <div className="text-xs text-red-600">{(form.errors as any).pdf}</div> : null}

                                <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr]">
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                                        {pdfPreviewUrl ? (
                                            <div className="space-y-2">
                                                <PdfThumb href={pdfPreviewUrl} title={form.data.title || 'PDF'} />
                                                <div className="flex items-center justify-between gap-2">
                                                    <Button asChild size="sm" variant="secondary" className="h-9 rounded-full">
                                                        <a href={pdfPreviewUrl} target="_blank" rel="noreferrer">
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Open
                                                        </a>
                                                    </Button>
                                                    <Button asChild size="sm" variant="secondary" className="h-9 rounded-full">
                                                        <a href={pdfPreviewUrl} download>
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Download
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid aspect-[3/4] w-full place-items-center rounded-2xl bg-slate-50 text-slate-500 dark:bg-slate-900/30 dark:text-slate-300">
                                                <div className="grid place-items-center gap-2">
                                                    <FileText className="h-7 w-7" />
                                                    <div className="text-xs font-medium">No PDF selected</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200">
                                        <div className="font-semibold">Tips</div>
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600 dark:text-slate-300">
                                            <li>Use clear titles for easier searching.</li>
                                            <li>Set inactive if it should not appear publicly.</li>
                                            <li>Upload a new PDF to replace the existing file.</li>
                                        </ul>

                                        {editing?.pdf_url ? (
                                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                                                <div className="text-xs font-semibold text-slate-500">Current file</div>
                                                <a
                                                    href={editing.pdf_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-[#00359c] hover:underline"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    Open current PDF
                                                </a>
                                            </div>
                                        ) : null}
                                    </div>
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

            {/* -------------------- Delete Confirm -------------------- */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this issuance?</AlertDialogTitle>
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
