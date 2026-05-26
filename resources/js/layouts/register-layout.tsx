import * as React from 'react';
import { cn } from '@/lib/utils';

type RegisterLayoutProps = {
    children: React.ReactNode;
};

export default function RegisterLayout({ children }: RegisterLayoutProps) {
    return (
        <div className="relative isolate min-h-[100svh] w-full overflow-hidden bg-slate-50">
            {/* Full-page background cover (always visible) */}
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
                <img
                    src="/img/bg.png"
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className={cn('h-full w-full object-cover object-center')}
                />

                {/* overlays for readability (keep these subtle) */}
                <div className="absolute inset-0 bg-white/35" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,51,160,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(252,209,22,0.12),transparent_55%)]" />
            </div>

            {/* Content */}
            <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
