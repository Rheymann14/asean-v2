import * as React from 'react';
import { Head, Form, Link } from '@inertiajs/react';
import { Eye, EyeOff, LogIn } from 'lucide-react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import LoginLayout from '@/layouts/login-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}

export default function Login({ status, canResetPassword, canRegister }: LoginProps) {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
        <LoginLayout>
            <Head title="Log in" />

            {/* ✅ Center container like the reference design */}
            <div className="mx-auto flex min-h-[100svh] w-full items-center justify-center px-4 py-10 sm:px-6">
                <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-border/60 bg-background/70 shadow-2xl shadow-slate-900/10 backdrop-blur">
                    <div className="grid md:grid-cols-2">
                        {/* LEFT PANEL */}
                        <div className="relative flex items-center justify-center p-8 sm:p-10 md:p-12">
                            {/* Background */}
                            <div
                                aria-hidden
                                className="absolute inset-0 bg-gradient-to-br from-[#1e3c73] via-[#2b57a6] to-[#f59e0b]"
                            />
                            <div
                                aria-hidden
                                className="absolute inset-0 opacity-70 [background:radial-gradient(900px_circle_at_15%_0%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(700px_circle_at_110%_30%,rgba(255,255,255,0.12),transparent_60%)]"
                            />
                            <div
                                aria-hidden
                                className="absolute inset-0 hidden bg-[url('/img/loginbg.jpg')] bg-cover bg-center opacity-55 md:block"
                            />


                            {/* Content */}
                            {/* <div className="relative z-10 w-full max-w-md text-white">
                            

                                        <h1 className="mt-0 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                                            Welcome back
                                        </h1>
                                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85">
                                            Log in to access the ASEAN Philippines 2026 participant portal and manage your registration details.
                                        </p>

                                        <div className="mt-8 hidden text-xs text-white/80 md:block">
                                            ASEAN Philippines 2026 • “Navigating Our Future, Together”
                                        </div>
                                </div> */}
                        </div>

                        {/* RIGHT PANEL (FORM) */}
                        <div className="flex items-center justify-center bg-background/90 p-8 sm:p-10 md:p-12">
                            <div className="w-full max-w-sm">
                                <div className="text-center">
                                    <Link
                                        href="/"
                                        className="inline-flex items-center gap-3 rounded-2xl px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                        aria-label="Go to home"
                                        title="Go to home"
                                    >
                                        <img
                                            src="/img/bagong_pilipinas.png"
                                            alt="Bagong Pilipinas"
                                            className="h-20 w-auto object-contain"
                                            draggable={false}
                                            loading="lazy"
                                        />
                                        <img
                                            src="/img/asean_logo.png"
                                            alt="ASEAN Philippines 2026"
                                            className="h-20 w-auto object-contain"
                                            draggable={false}
                                            loading="lazy"
                                        />
                                    </Link>
                                    <div className="text-xs font-semibold tracking-widest text-muted-foreground">
                                        USER LOGIN
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Enter your email or participant ID and password to continue
                                    </p>
                                </div>

                                {status && (
                                    <div className="mt-6 rounded-2xl border border-green-200/70 bg-green-50/80 px-4 py-3 text-sm font-medium text-green-700 shadow-sm dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
                                        {status}
                                    </div>
                                )}

                                <div className="mt-6">
                                    <Form {...store.form()} resetOnSuccess={['password']} className="space-y-4">
                                        {({ processing, errors }) => (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email" className="text-sm">
                                                        Email or Participant ID
                                                    </Label>
                                                    <Input
                                                        id="email"
                                                        type="text"
                                                        name="email"
                                                        required
                                                        autoFocus
                                                        autoComplete="username"
                                                        placeholder="email@example.com or ASEAN-XXXX-XXXX"
                                                        className="h-11 rounded-xl"
                                                    />
                                                    <InputError message={errors.email} />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="password" className="text-sm">
                                                            Password
                                                        </Label>

                                                        {canResetPassword ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                {/* add your reset link here if you have route */}
                                                                {/* <TextLink href={...}>Forgot password?</TextLink> */}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    <div className="relative">
                                                        <Input
                                                            id="password"
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="password"
                                                            required
                                                            autoComplete="current-password"
                                                            placeholder="Password"
                                                            className="h-11 rounded-xl pr-11"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword((v) => !v)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                        >
                                                            {showPassword ? (
                                                                <Eye className="h-4 w-4" aria-hidden />
                                                            ) : (
                                                                <EyeOff className="h-4 w-4" aria-hidden />
                                                            )}
                                                        </button>
                                                    </div>

                                                    <InputError message={errors.password} />
                                                </div>

                                                <Button
                                                    type="submit"
                                                    className="h-11 w-full rounded-xl bg-gradient-to-r from-[#1e3c73] to-[#25468a] text-white shadow-md shadow-slate-900/10 hover:opacity-95"
                                                    disabled={processing}
                                                    data-test="login-button"
                                                >
                                                    {processing ? (
                                                        <Spinner />
                                                    ) : (
                                                        <LogIn className="mr-2 h-4 w-4" aria-hidden />
                                                    )}
                                                    Log in
                                                </Button>

                                                {canRegister && (
                                                    <div className="pt-2 text-center text-sm text-muted-foreground">
                                                        Don&apos;t have an account?{' '}
                                                        <TextLink href={register()} className="font-medium">
                                                            Sign up
                                                        </TextLink>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </Form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LoginLayout>
    );
}
