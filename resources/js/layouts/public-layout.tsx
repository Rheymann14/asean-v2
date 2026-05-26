import * as React from 'react';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ArrowRight, LogIn, LayoutDashboard, Globe, Facebook } from 'lucide-react';

type NavItem = { label: string; href: string };

export const PUBLIC_NAV_ITEMS: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Venue', href: '/venue' },
    { label: 'Event', href: '/event' },
    { label: 'Resources', href: '/issuances' },
    { label: 'Contact Us', href: '/contact-us' },
];

/** ✅ Strong, very visible active state (pill + underline) */
const navItemClass = (active: boolean) =>
    cn(
        'relative inline-flex items-center rounded-full px-3 py-2 text-[13px] font-semibold tracking-wide transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3c73]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80',
        // subtle indicator bar
        'after:absolute after:inset-x-3 after:-bottom-1 after:h-[3px] after:rounded-full after:transition-opacity',
        active
            ? 'bg-[#1e3c73] text-white shadow-[0_12px_30px_-22px_rgba(30,60,115,0.9)] after:bg-white/85 after:opacity-100'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-900/5 after:bg-[#1e3c73] after:opacity-0 hover:after:opacity-100',
    );

function NavAnchor({
    href,
    children,
    active = false,
    onClick,
}: {
    href: string;
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <a href={href} onClick={onClick} className={navItemClass(active)} aria-current={active ? 'page' : undefined}>
            {children}
        </a>
    );
}

export default function PublicLayout({
    children,
    background,
    canRegister = true,
    navActive,
    onNavActiveChange,
}: {
    children: React.ReactNode;
    background?: React.ReactNode; // ✅ slot for Welcome only
    canRegister?: boolean;
    navActive?: string;
    onNavActiveChange?: (href: string) => void;
}) {
    const { auth } = usePage<SharedData>().props;
    const pageUrl = usePage().url;
    const isHome = pageUrl === '/' || pageUrl.startsWith('/?');
    const userType = auth.user?.user_type ?? auth.user?.userType;
    const roleName = (userType?.name ?? '').toUpperCase();
    const roleSlug = (userType?.slug ?? '').toUpperCase();
    const isAdmin = roleName === 'ADMIN' || roleSlug === 'ADMIN';
    const isChedLo = roleName === 'CHED LO' || roleSlug === 'CHED-LO';
    const dashboardHref = isAdmin ? '/dashboard' : isChedLo ? '/vehicle-assignment' : '/participant-dashboard';

    const toHref = (href: string) => {
        if (href.startsWith('#') && !isHome) return `/${href}`;
        return href;
    };

    /** ✅ hash uses navActive; normal routes use current URL */
    const isActive = (href: string) => {
        if (href.startsWith('#')) return !!navActive && navActive === href;
        return pageUrl === href || pageUrl.startsWith(`${href}/`);
    };

    /** ✅ Navbar becomes transparent after scroll */
    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const onScroll = () => {
            setIsScrolled(window.scrollY > 14);
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div id="home" className="relative isolate min-h-screen w-full bg-slate-50 text-slate-900">
            {/* ✅ Background comes only from pages that pass it (Welcome) */}
            {background}

            {/* Navbar */}
            <header className="sticky top-0 z-50">
                <div
                    className={cn(
                        'backdrop-blur-md transition-all duration-300',
                        // base
                        'border-b',
                        // ✅ transparent when scrolled
                        isScrolled
                            ? 'border-transparent bg-transparent supports-[backdrop-filter]:bg-white/10'
                            : 'border-slate-900/5 bg-white/65 shadow-[0_10px_30px_-25px_rgba(15,23,42,0.35)]',
                    )}
                >
                    <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
                        <Link href="/" className="flex items-center gap-3">
                            <img
                                src="/img/asean_banner_logo.png"
                                alt="ASEAN Philippines 2026"
                                className="h-10 w-auto drop-shadow-sm sm:h-11"
                                draggable={false}
                            />
                        </Link>

                        {/* Desktop nav */}
                        <nav className="ml-auto hidden items-center gap-3 lg:flex">
                            {PUBLIC_NAV_ITEMS.map((item) => {
                                const href = toHref(item.href);

                                // Home + hash => normal anchor scrolling
                                if (isHome && item.href.startsWith('#')) {
                                    return (
                                        <NavAnchor
                                            key={item.href}
                                            href={item.href}
                                            active={isActive(item.href)}
                                            onClick={() => onNavActiveChange?.(item.href)}
                                        >
                                            {item.label.toUpperCase()}
                                        </NavAnchor>
                                    );
                                }

                                // Non-home hash => go back to /#section
                                return (
                                    <Link
                                        key={item.href}
                                        href={href}
                                        className={navItemClass(isActive(item.href))}
                                        onClick={() => onNavActiveChange?.(item.href)}
                                        aria-current={isActive(item.href) ? 'page' : undefined}
                                    >
                                        {item.label.toUpperCase()}
                                    </Link>
                                );
                            })}

                            {auth.user ? (
                                <Button asChild className="rounded-xl px-5 py-6 text-base">
                                    <Link href={dashboardHref}>
                                        <LayoutDashboard className="mr-2 h-5 w-5" />
                                        Dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" asChild className="rounded-xl px-5 py-6 text-base">
                                        <Link href="/login">
                                            <LogIn className="mr-2 h-5 w-5" />
                                            Log in
                                        </Link>
                                    </Button>

                                    {canRegister && (
                                        <Button
                                            asChild
                                            className="rounded-xl bg-gradient-to-r from-[#1e3c73] via-[#25468a] to-[#1e3c73] px-6 py-6 text-base font-semibold shadow-sm hover:brightness-110"
                                        >
                                            <Link href="/register">
                                                Register Now
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </nav>

                        {/* Mobile menu */}
                        <div className="ml-auto lg:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'rounded-xl px-4 py-6 transition-colors',
                                            isScrolled ? 'bg-white/20' : 'bg-white/70',
                                        )}
                                    >
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>

                                <SheetContent side="right" className="w-[320px] p-0">
                                    <div className="border-b px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src="/img/asean_banner_logo.png"
                                                alt="ASEAN Philippines 2026"
                                                className="h-10 w-auto"
                                                draggable={false}
                                            />
                                        </div>
                                    </div>

                                    <div className="px-5 py-5">
                                        <div className="grid gap-3">
                                            {PUBLIC_NAV_ITEMS.map((item) => {
                                                const href = toHref(item.href);
                                                const active = isActive(item.href);

                                                return (
                                                    <SheetClose asChild key={item.href}>
                                                        {isHome && item.href.startsWith('#') ? (
                                                            <a
                                                                href={item.href}
                                                                onClick={() => onNavActiveChange?.(item.href)}
                                                                className={cn(
                                                                    'rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
                                                                    active
                                                                        ? 'border-[#1e3c73]/40 bg-[#1e3c73] text-white shadow-sm'
                                                                        : 'bg-background hover:bg-muted',
                                                                )}
                                                                aria-current={active ? 'page' : undefined}
                                                            >
                                                                {item.label}
                                                            </a>
                                                        ) : (
                                                            <Link
                                                                href={href}
                                                                onClick={() => onNavActiveChange?.(item.href)}
                                                                className={cn(
                                                                    'rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
                                                                    active
                                                                        ? 'border-[#1e3c73]/40 bg-[#1e3c73] text-white shadow-sm'
                                                                        : 'bg-background hover:bg-muted',
                                                                )}
                                                                aria-current={active ? 'page' : undefined}
                                                            >
                                                                {item.label}
                                                            </Link>
                                                        )}
                                                    </SheetClose>
                                                );
                                            })}

                                            <div className="mt-2 grid gap-2">
                                                {auth.user ? (
                                                    <Button asChild className="rounded-xl">
                                                        <Link href={dashboardHref}>Dashboard</Link>
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button variant="outline" asChild className="rounded-xl">
                                                            <Link href="/login">Log in</Link>
                                                        </Button>

                                                        {canRegister && (
                                                            <Button
                                                                asChild
                                                                className="rounded-xl bg-gradient-to-r from-[#1e3c73] via-[#25468a] to-[#1e3c73] font-semibold hover:brightness-110"
                                                            >
                                                                <Link href="/register">Register Now</Link>
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>

            {/* Page content */}
            <main className="relative z-10">{children}</main>

            {/* Footer top strip */}
            <div aria-hidden className="relative z-10 -mb-px">
                <div className="relative overflow-hidden rounded-t-[2.5rem]">
                    <img
                        src="/img/bg.png"
                        alt=""
                        draggable={false}
                        loading="lazy"
                        className="h-[120px] w-full object-cover sm:h-[160px] lg:h-[220px]
                        [mask-image:linear-gradient(to_bottom,transparent_0%,black_35%,black_100%)]
                        [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_35%,black_100%)]
                        [mask-repeat:no-repeat] [mask-size:100%_100%]
                        [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:100%_100%]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b1426]/70 to-transparent sm:h-20 lg:h-28" />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 sm:left-10">
                        <img
                            src="/img/asean_banner_logo.png"
                            alt="ASEAN Philippines 2026"
                            className="h-10 w-auto drop-shadow-md sm:h-12 lg:h-14"
                            draggable={false}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 bg-[#0b1426] text-slate-200">
                <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/20" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="relative py-14">
                        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2">
                                            <img
                                                src="/img/asean_logo.png"
                                                alt="ASEAN Logo"
                                                className="h-20 w-20 object-contain"
                                                draggable={false}
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-base font-semibold tracking-wide text-white">ASEAN PH 2026</p>
                                        <p className="text-xs text-slate-400">Participant Registration</p>
                                    </div>
                                </div>

                                <p className="max-w-sm text-sm leading-relaxed text-slate-300">
                                    Official event registration portal. Please review the memo and FAQs before submitting your details.
                                </p>
                            </div>

                            <div>
                                <p className="text-sm font-semibold tracking-wide text-white">SITEMAP</p>
                                <ul className="mt-5 space-y-3 text-sm">
                                    {[
                                        { label: 'Venue', href: '/venue' },
                                        { label: 'Event', href: '/event' },
                                        { label: 'Resources', href: '/issuances' },
                                        { label: 'Contact Us', href: '/contact-us' },
                                    ].map((item) => (
                                        <li key={item.href}>
                                            <a href={item.href} className="text-slate-300 transition-colors hover:text-white">
                                                {item.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="lg:justify-self-end">
                                <p className="text-sm font-semibold tracking-wide text-white">DEVELOPED BY</p>

                                <div className="mt-4 flex items-center justify-start gap-4">
                                    <div className="grid size-20 place-items-center sm:size-24">
                                        <img
                                            src="/img/ched_logo.png"
                                            alt="CHED Logo"
                                            className="max-h-full max-w-full object-contain"
                                            draggable={false}
                                            loading="lazy"
                                        />
                                    </div>

                                    <div className="grid size-28 place-items-center sm:size-32">
                                        <img
                                            src="/img/bagong_pilipinas.png"
                                            alt="Bagong Pilipinas Logo"
                                            className="max-h-full max-w-full object-contain"
                                            draggable={false}
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                            <p>Copyright © 2026 All Rights Reserved</p>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                <a
                                    href="https://ched.gov.ph/"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
                                >
                                    <Globe className="h-4 w-4" />
                                    ched.gov.ph
                                </a>

                                <a
                                    href="https://www.facebook.com/PhCHED.gov"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
                                >
                                    <Facebook className="h-4 w-4" />
                                    Facebook
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
