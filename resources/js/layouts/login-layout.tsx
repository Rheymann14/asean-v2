import * as React from 'react';
import { cn } from '@/lib/utils';

type LoginLayoutProps = {
    children: React.ReactNode;
};

export default function LoginLayout({ children }: LoginLayoutProps) {
    return (
        <div className="relative isolate min-h-[100svh] w-full overflow-hidden bg-slate-50">
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
                <img
                    src="/img/bg.png"
                    alt=""
                    draggable={false}
                    loading="lazy"
                    className={cn('h-full w-full object-cover object-center')}
                />
                <div className="absolute inset-0 bg-white/40" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,51,160,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(252,209,22,0.12),transparent_55%)]" />
            </div>

            <main className="relative z-10 min-h-[100svh] w-full overflow-x-hidden">{children}</main>
        </div>
    );
}
