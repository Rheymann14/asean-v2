import * as React from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Image, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type SectionImage = {
    id: number;
    title: string;
    description: string | null;
    link: string | null;
    image_path: string;
    updated_at?: string | null;
};

type SectionData = {
    title: string;
    images: SectionImage[];
};

type PageProps = {
    section?: SectionData | null;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Section Management', href: '/section-management' }];

const ENDPOINTS = {
    title: '/section-management/title',
    store: '/section-management',
    update: (id: number) => `/section-management/${id}`,
    destroy: (id: number) => `/section-management/${id}`,
};

function resolveSectionImage(imagePath?: string | null) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('/')) return imagePath;
    return `/section/${imagePath}`;
}

function showToastError(errors: Record<string, string | string[]>) {
    const firstError = Object.values(errors)?.[0];
    const message = Array.isArray(firstError) ? firstError[0] : firstError;
    toast.error(message || 'Something went wrong. Please try again.');
}

export default function SectionManagement({ section }: PageProps) {
    const sectionTitle = section?.title ?? 'Section Title';
    const images = section?.images ?? [];

    const sectionForm = useForm<{ title: string }>({
        title: sectionTitle,
    });

    const imageForm = useForm<{ title: string; description: string; link: string; image: File | null }>({
        title: '',
        description: '',
        link: '',
        image: null,
    });

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<SectionImage | null>(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<SectionImage | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = React.useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        sectionForm.setData('title', sectionTitle);
    }, [sectionTitle]);

    React.useEffect(() => {
        return () => {
            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function openCreate() {
        setEditing(null);
        imageForm.reset();
        imageForm.clearErrors();
        setCurrentImageUrl(null);
        setPreviewUrl(null);
        setDialogOpen(true);
    }

    function openEdit(item: SectionImage) {
        setEditing(item);
        imageForm.setData({
            title: item.title ?? '',
            description: item.description ?? '',
            link: item.link ?? '',
            image: null,
        });
        imageForm.clearErrors();
        setCurrentImageUrl(resolveSectionImage(item.image_path));
        setPreviewUrl(null);
        setDialogOpen(true);
    }

    function handleImageChange(file: File | null) {
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        const nextPreview = file ? URL.createObjectURL(file) : null;
        setPreviewUrl(nextPreview);
        imageForm.setData('image', file);
    }

    function submitSectionTitle(e: React.FormEvent) {
        e.preventDefault();
        sectionForm.transform((data) => ({
            title: data.title.trim(),
        }));

        sectionForm.patch(ENDPOINTS.title, {
            preserveScroll: true,
            onSuccess: () => toast.success('Section title updated.'),
            onError: (errors) => showToastError(errors as Record<string, string | string[]>),
        });
    }

    function submitImage(e: React.FormEvent) {
        e.preventDefault();
        const isEditing = Boolean(editing);

        imageForm.transform((data) => ({
            title: data.title.trim(),
            description: data.description.trim(),
            link: data.link.trim(),
            image: data.image,
            ...(isEditing ? { _method: 'patch' } : {}),
        }));

        const url = editing ? ENDPOINTS.update(editing.id) : ENDPOINTS.store;

        imageForm.post(url, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setDialogOpen(false);
                setEditing(null);
                imageForm.reset();
                setCurrentImageUrl(null);
                setPreviewUrl(null);
                toast.success(editing ? 'Section image updated.' : 'Section image added.');
            },
            onError: (errors) => showToastError(errors as Record<string, string | string[]>),
        });
    }

    function requestDelete(item: SectionImage) {
        setDeleteTarget(item);
        setDeleteOpen(true);
    }

    function confirmDelete() {
        if (!deleteTarget) return;

        router.delete(ENDPOINTS.destroy(deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Section image deleted.');
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
            onError: (errors) => showToastError(errors as Record<string, string | string[]>),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Section Management" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-[#00359c]" />
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            Section Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Update the public venue section title and manage image cards.
                    </p>
                </div>

                <div className="grid gap-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Section title</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    This title appears above the image grid on the public venue page.
                                </p>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <form onSubmit={submitSectionTitle} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Title
                                </label>
                                <Input
                                    value={sectionForm.data.title}
                                    onChange={(e) => sectionForm.setData('title', e.target.value)}
                                    placeholder="Section Title"
                                />
                                {sectionForm.errors.title ? (
                                    <div className="mt-1 text-xs text-red-600">{sectionForm.errors.title}</div>
                                ) : null}
                            </div>
                            <Button
                                type="submit"
                                className="h-10 rounded-2xl bg-[#00359c] text-white hover:bg-[#00359c]/90"
                                disabled={sectionForm.processing}
                            >
                                Save title
                            </Button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Section images</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Upload images with titles and descriptions for the section cards.
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={openCreate}
                                className="h-9 rounded-2xl bg-[#00359c] text-white hover:bg-[#00359c]/90"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add image
                            </Button>
                        </div>

                        <Separator className="my-4" />

                        {images.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                                No section images yet.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[110px]">Preview</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Link</TableHead>
                                            <TableHead className="w-[80px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {images.map((item) => {
                                            const imageUrl = resolveSectionImage(item.image_path);
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="h-16 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                                                            {imageUrl ? (
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={item.title}
                                                                    className="h-full w-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-[10px] text-slate-500">
                                                                    No image
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="whitespace-normal">
                                                        <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {item.title}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="whitespace-normal">
                                                        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                                                            {item.description || '—'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="whitespace-normal">
                                                        {item.link ? (
                                                            <a
                                                                href={item.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm font-medium text-[#00359c] underline-offset-4 hover:underline"
                                                            >
                                                                {item.link}
                                                            </a>
                                                        ) : (
                                                            <span className="text-sm text-slate-500">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-44">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => openEdit(item)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => requestDelete(item)}>
                                                                    <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit section image' : 'Add section image'}</DialogTitle>
                        <DialogDescription>
                            Provide a title, description, and image for the venue section.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitImage} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Image title</label>
                            <Input
                                value={imageForm.data.title}
                                onChange={(e) => imageForm.setData('title', e.target.value)}
                                placeholder="Image title"
                            />
                            {imageForm.errors.title ? (
                                <div className="text-xs text-red-600">{imageForm.errors.title}</div>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Image description
                            </label>
                            <Textarea
                                value={imageForm.data.description}
                                onChange={(e) => imageForm.setData('description', e.target.value)}
                                placeholder="Short description"
                                rows={3}
                                className="break-all"
                            />
                            {imageForm.errors.description ? (
                                <div className="text-xs text-red-600">{imageForm.errors.description}</div>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Redirection link
                            </label>
                            <Input
                                value={imageForm.data.link}
                                onChange={(e) => imageForm.setData('link', e.target.value)}
                                placeholder="https://example.com"
                            />
                            {imageForm.errors.link ? (
                                <div className="text-xs text-red-600">{imageForm.errors.link}</div>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Upload image
                            </label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                            />
                            {imageForm.errors.image ? (
                                <div className="text-xs text-red-600">{imageForm.errors.image}</div>
                            ) : null}

                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="h-48 w-full object-contain" />
                                ) : currentImageUrl ? (
                                    <img
                                        src={currentImageUrl}
                                        alt="Current section"
                                        className="h-48 w-full object-contain"
                                    />
                                ) : (
                                    <div className="grid h-48 place-items-center text-xs text-slate-500">No image selected</div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" className="bg-[#00359c] text-white hover:bg-[#00359c]/90">
                                {editing ? 'Save changes' : 'Add image'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the image from the section and deletes its file from storage.
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
