import { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AppLogoIconProps = ImgHTMLAttributes<HTMLImageElement>;

export default function AppLogoIcon({ className, ...props }: AppLogoIconProps) {
    return (
        <img
            {...props}
            src="/img/asean_logo.png"
            alt={props.alt ?? 'App Logo'}
            draggable={false}
            loading={props.loading ?? 'lazy'}
            decoding={props.decoding ?? 'async'}
            className={cn(
                'h-16 w-auto object-contain shrink-0', // ✅ bigger by default
                className
            )}
        />
    );
}
