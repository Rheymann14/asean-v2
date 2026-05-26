import * as React from 'react';
import { cn } from '@/lib/utils';

type AppLogoProps = {
    className?: string;
    bannerClassName?: string;
    iconClassName?: string;
};

export default function AppLogo({ className, bannerClassName, iconClassName }: AppLogoProps) {
    return (
        <div className={cn('flex items-center', className)}>
            {/* ✅ Collapsed ONLY: show small logo */}
            <img
                src="/img/asean_logo.png"
                alt="ASEAN"
                className={cn(
                    'hidden h-8 w-8 shrink-0 object-contain group-data-[state=collapsed]:block',
                    iconClassName
                )}
                draggable={false}
                decoding="async"
                fetchPriority="high"
            />

            {/* ✅ Default (all views): show banner */}
            <img
                src="/img/asean_banner_logo.png"
                alt="ASEAN Philippines 2026"
                className={cn(
                    'h-8 w-auto max-w-[190px] object-contain group-data-[state=collapsed]:hidden sm:h-9 md:h-10',
                    bannerClassName
                )}
                draggable={false}
                decoding="async"
                fetchPriority="high"
            />
        </div>
    );
}
