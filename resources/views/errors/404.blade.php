<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>404 - Page Not Found</title>
        <style>
            :root {
                color-scheme: light;
                font-family: "Instrument Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
            }

            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #0b2b62;
                background: #0b1d3a;
                background-image: url("{{ asset('img/bg.png') }}");
                background-size: cover;
                background-position: center;
                position: relative;
            }

            body::before {
                content: "";
                position: absolute;
                inset: 0;
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(1px);
            }

            main {
                position: relative;
                z-index: 1;
                width: min(720px, 90vw);
                padding: clamp(24px, 5vw, 48px);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: clamp(12px, 3vw, 20px);
            }

            .logo {
                width: min(360px, 80%);
                height: auto;
            }

            h1 {
                font-size: clamp(2.2rem, 6vw, 3.4rem);
                font-weight: 700;
            }

            p {
                font-size: clamp(1rem, 3vw, 1.15rem);
                color: #29436f;
            }

            .btn {
                text-decoration: none;
                padding: 12px 26px;
                border-radius: 999px;
                font-weight: 600;
                background: #0c4096;
                color: #fff;
                box-shadow: 0 10px 24px rgba(12, 64, 150, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 28px rgba(12, 64, 150, 0.35);
            }
        </style>
    </head>
    <body>
        <main>
            <img class="logo" src="{{ asset('img/asean_banner_logo.png') }}" alt="ASEAN Philippines 2026 logo">
            <h1>404</h1>
            <p>Page not found.</p>
            <a class="btn" href="javascript:history.back()">Go back</a>
        </main>
    </body>
</html>
