import * as React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Textarea } from '@/components/ui/textarea';

import { Mail, Phone, MapPin, MoreHorizontal, Pencil, Save, X, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type ContactCardKey = 'email' | 'phone' | 'office';

type ContactDetail = {
    id: number;
    key: ContactCardKey;
    title: string;
    value: string;
    is_active: boolean;
    updated_at?: string | null;
    updated_by_name?: string | null;
};

type PageProps = {
    items?: ContactDetail[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Contact Details', href: '/contact-details' }];

const ENDPOINTS = {
    update: (id: number) => `/contact-details/${id}`,
};

const PRIMARY_BTN =
    'bg-[#00359c] text-white hover:bg-[#00359c]/90 focus-visible:ring-[#00359c]/30 dark:bg-[#00359c] dark:hover:bg-[#00359c]/90';

function iconFor(key: ContactCardKey) {
    if (key === 'email') return <Mail className="h-5 w-5" />;
    if (key === 'phone') return <Phone className="h-5 w-5" />;
    return <MapPin className="h-5 w-5" />;
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

export default function ContactDetails(props: PageProps) {
    const items = props.items ?? [];

    const [editOpen, setEditOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<ContactDetail | null>(null);

    const form = useForm<{ title: string; value: string; is_active: boolean }>({
        title: '',
        value: '',
        is_active: true,
    });

    function openEdit(item: ContactDetail) {
        setEditing(item);
        form.setData({
            title: item.title ?? '',
            value: item.value ?? '',
            is_active: !!item.is_active,
        });
        form.clearErrors();
        setEditOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!editing) return;

        form.transform((data) => ({
            title: data.title.trim(),
            value: data.value.trim(),
            is_active: !!data.is_active,
        }));

        form.patch(ENDPOINTS.update(editing.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                setEditing(null);
                toast.success('Contact details updated.');
            },
            onError: (errors) => showToastError(errors as Record<string, string | string[]>),
        });
    }

    function showToastError(errors: Record<string, string | string[]>) {
        const firstError = Object.values(errors)?.[0];
        const message = Array.isArray(firstError) ? firstError[0] : firstError;
        toast.error(message || 'Something went wrong. Please try again.');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contact Details" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* header (no card) */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Contact Details
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Edit what appears on the public Contact Us cards (Email / Phone / Office).
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid gap-5 md:grid-cols-3">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950',
                                    !item.is_active && 'opacity-70',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-4">
                                        <div className="grid size-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                                            <span className="text-[#00359c]">{iconFor(item.key)}</span>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {item.title}
                                            </div>
                                            <div className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                                                {item.value}
                                            </div>
                                        </div>
                                    </div>

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
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <Separator className="my-4" />

                                <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge active={item.is_active} />
                                    </div>
                                    <span>Updated: {formatDateTimeSafe(item.updated_at)}</span>
                                </div>
                           
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Edit Contact Card</DialogTitle>
                        <DialogDescription>Update the card title and value shown on the public Contact Us page.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-1.5">
                            <div className="text-sm font-medium">Title</div>
                            <Input
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="e.g. Email"
                            />
                            {form.errors.title ? <div className="text-xs text-red-600">{form.errors.title}</div> : null}
                        </div>

                        <div className="space-y-1.5">
                            <div className="text-sm font-medium">Value</div>
                            <Textarea
                                value={form.data.value}
                                onChange={(e) => form.setData('value', e.target.value)}
                                placeholder="e.g. info@ched.gov.ph"
                                className="min-h-[110px]"
                            />
                            {form.errors.value ? <div className="text-xs text-red-600">{form.errors.value}</div> : null}
                        </div>

                        {/* ✅ Switch like your other pages */}
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium">{form.data.is_active ? 'Active' : 'Inactive'}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                    Inactive cards can be hidden from the public page.
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{form.data.is_active ? 'On' : 'Off'}</span>
                                <Switch
                                    checked={form.data.is_active}
                                    onCheckedChange={(v) => form.setData('is_active', !!v)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={form.processing}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                            <Button type="submit" className={PRIMARY_BTN} disabled={form.processing}>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
