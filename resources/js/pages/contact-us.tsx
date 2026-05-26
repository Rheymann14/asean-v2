import * as React from 'react';
import PublicLayout from '@/layouts/public-layout';
import { Head } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

type ContactCardKey = 'email' | 'phone' | 'office';

type ContactDetail = {
    key: ContactCardKey;
    title: string;
    value: string;
    is_active?: boolean;
};

type PageProps = {
    items?: ContactDetail[];
};

function iconFor(key: ContactCardKey) {
    if (key === 'email') return <Mail className="h-5 w-5 text-[#1e3c73]" />;
    if (key === 'phone') return <Phone className="h-5 w-5 text-[#1e3c73]" />;
    return <MapPin className="h-5 w-5 text-[#1e3c73]" />;
}

export default function ContactUs(props: PageProps) {
    const items = props.items ?? [];
    const activeItems = React.useMemo(() => items.filter((item) => item.is_active !== false), [items]);

    return (
        <>
            <Head title="Contact Us" />

            <PublicLayout navActive="/contact-us">
                <section className="relative overflow-hidden">
                    {/* soft background */}
                    {/* <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
                    <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#0033A0]/10 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#FCD116]/15 blur-3xl" /> */}

                    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                        <div className="mx-auto max-w-5xl text-center">
                            {/* ✅ Title stays as-is */}
                            <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                                <span className="relative inline-block">
                                    <span className="relative z-10 text-[#0033A0]">Contact</span>
                                    <span className="pointer-events-none absolute inset-x-0 bottom-1 -z-0 h-2 rounded-full bg-[#0033A0]/15 blur-[1px]" />
                                </span>{' '}
                                Us
                            </h2>

                            <p className="mt-4 text-slate-600">
                                For inquiries and assistance regarding the ASEAN PH 2026 Participant Registration.
                            </p>

                            <div className="mx-auto mt-6 flex items-center justify-center gap-3">
                                <span className="h-px w-12 bg-slate-200" />
                                <span className="h-2 w-2 rounded-full bg-[#FCD116] shadow-[0_0_0_6px_rgba(252,209,22,0.12)]" />
                                <span className="h-px w-12 bg-slate-200" />
                            </div>
                        </div>

                        {/* ✅ CHED Building Image */}
                        <div className="mx-auto mt-10 max-w-5xl">
                            <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] backdrop-blur">
                                <img
                                    src="/img/ched_co.jpg"
                                    alt="CHED Central Office building"
                                    className="h-[220px] w-full object-cover object-[50%_25%] sm:h-[300px] lg:h-[340px]"
                                    draggable={false}
                                    loading="lazy"
                                />

                                {/* vignette + top highlight */}
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-slate-900/10 to-transparent"
                                />
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent"
                                />

                                {/* caption */}
                                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                                    <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur">
                                        CHED Central Office
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Contact Cards (NOT clickable) */}
                        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {activeItems.map((item) => (
                                <Card
                                    key={item.key}
                                    className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[#1e3c73]/20 hover:bg-white/80 hover:shadow-md"
                                >
                                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                                        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#0033A0]/10 blur-2xl" />
                                    </div>

                                    <div className="relative flex items-start gap-4">
                                        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm transition group-hover:border-[#1e3c73]/20 group-hover:bg-white">
                                            {iconFor(item.key)}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                            <p className="mt-1 whitespace-pre-line text-sm font-medium text-slate-700 group-hover:text-slate-900">
                                                {item.value}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        
                            {/* ✅ BIG + centered logo (break out of container) */}
                            <div className="relative left-1/2 right-1/2 mt-12 w-screen -ml-[50vw] -mr-[50vw] px-4 sm:px-6 lg:px-8">
                                <img
                                    src="/img/the_logo.png"
                                    alt="ASEAN PH 2026 logo"
                                    className="mx-auto h-auto w-full max-w-[1000px] object-contain"
                                    draggable={false}
                                    loading="lazy"
                                />
                            </div>
                    </div>
                </section>
            </PublicLayout>
        </>
    );
}
