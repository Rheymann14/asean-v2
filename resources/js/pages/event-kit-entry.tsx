import * as React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import PublicLayout from '@/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, IdCard, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type PageProps = {
    errors?: Record<string, string>;
};

export default function EventKitEntry() {
    const { errors } = usePage<PageProps>().props;
    const form = useForm({
        participant_id: '',
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post('/event-kit/verify', {
            onSuccess: () => toast.success('Participant verified.'),
            onError: () => toast.error('Unable to verify participant ID.'),
        });
    };

    return (
        <>
            <Head title="Event Kit Access" />
            <PublicLayout navActive="/event">
                <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <Badge variant="outline" className="mb-3">
                            Event Kit Access
                        </Badge>
                        <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                            Enter your participant ID to access the event kit
                        </h1>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Use your ASEAN participant ID (e.g., ASEAN-XXXX-XXXX) or registered email address.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <Card className="border-slate-200/70 bg-white/70 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                            <form onSubmit={submit} className="space-y-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="participant-id">
                                    Participant ID / Email
                                </label>
                                <Input
                                    id="participant-id"
                                    value={form.data.participant_id}
                                    onChange={(event) => form.setData('participant_id', event.target.value)}
                                    placeholder="ASEAN-XXXX-XXXX"
                                    className={cn(errors?.participant_id && 'border-rose-500 focus-visible:ring-rose-500/30')}
                                />
                                {errors?.participant_id ? (
                                    <p className="text-xs text-rose-500">{errors.participant_id}</p>
                                ) : null}

                                <Button
                                    type="submit"
                                    className="h-10 w-full bg-[#0033A0] text-white hover:bg-[#0033A0]/90"
                                    disabled={form.processing}
                                >
                                    Continue to questionnaire
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </form>
                        </Card>

                        <div className="space-y-3">
                            <Card className="border-slate-200/70 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 rounded-xl bg-[#0033A0]/10 p-2 text-[#0033A0]">
                                        <IdCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Need your ID?</h2>
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                            Check the email confirmation sent after registration. Your ASEAN ID appears on your
                                            QR badge.
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-slate-200/70 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 rounded-xl bg-[#FCD116]/20 p-2 text-[#9C7A00]">
                                        <QrCode className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Event kit flow</h2>
                                        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                            <li>1. Enter participant ID</li>
                                            <li>2. Answer the event questionnaire</li>
                                            <li>3. Download event kit + certificates</li>
                                        </ul>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>
            </PublicLayout>
        </>
    );
}
