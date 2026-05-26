import * as React from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

type Participant = {
    name: string;
    display_id: string;
};

type Programme = {
    title: string;
    starts_at: string | null;
    ends_at: string | null;
    location: string | null;
};

type PageProps = {
    participant: Participant;
    programme: Programme;
    type: 'appearance' | 'participation';
};

function formatDateRange(startsAt?: string | null, endsAt?: string | null) {
    if (!startsAt) return 'Date TBD';
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;

    const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'long', day: '2-digit', year: 'numeric' });
    const date = dateFmt.format(start);

    if (!end) return date;

    const sameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

    return sameDay ? date : `${date} – ${dateFmt.format(end)}`;
}

export default function EventKitCertificate() {
    const { participant, programme, type } = usePage<PageProps>().props;
    const title = type === 'appearance' ? 'Certificate of Appearance' : 'Certificate of Participation';

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 print:bg-white print:px-0 print:py-0">
                <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 print:hidden">
                    <Button asChild variant="outline" className="h-9">
                        <a href="/event-kit/materials">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back to event kit
                        </a>
                    </Button>
                    <Button className="h-9 bg-[#0033A0] text-white hover:bg-[#0033A0]/90" onClick={() => window.print()}>
                        <Printer className="mr-1 h-4 w-4" />
                        Print / Save as PDF
                    </Button>
                </div>

                <Card className="mx-auto mt-6 max-w-4xl rounded-3xl border-slate-200 bg-white p-10 shadow-lg dark:border-slate-800 dark:bg-slate-950 print:mt-0 print:border-none print:shadow-none">
                    <div className="text-center">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">ASEAN Philippines 2026</div>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                            {title}
                        </h1>
                        <div className="mx-auto mt-4 h-px w-32 bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">
                        This is to certify that
                    </div>
                    <div className="mt-3 text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        {participant.name}
                    </div>
                    <div className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                        Participant ID: {participant.display_id}
                    </div>

                    <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
                        has successfully completed the event activity
                    </div>
                    <div className="mt-2 text-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {programme.title}
                    </div>

                    <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
                        {formatDateRange(programme.starts_at, programme.ends_at)}
                    </div>
                    {programme.location ? (
                        <div className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                            {programme.location}
                        </div>
                    ) : null}

                    <div className="mt-8 grid grid-cols-2 gap-6 text-xs text-slate-500 dark:text-slate-400">
                        <div className="text-center">
                            <div className={cn('mx-auto h-px w-32 bg-slate-300 dark:bg-slate-700')} />
                            <div className="mt-2">Event Organizer</div>
                        </div>
                        <div className="text-center">
                            <div className={cn('mx-auto h-px w-32 bg-slate-300 dark:bg-slate-700')} />
                            <div className="mt-2">Authorized Signatory</div>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}
