type RawHtmlOptions = {
    printable: string;
    type: 'raw-html';
    style?: string;
    documentTitle?: string;
};

export default function printJS(options: RawHtmlOptions) {
    if (typeof window === 'undefined') return;
    if (options.type !== 'raw-html') return;

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';

    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const doc = frameWindow?.document;
    if (!doc) {
        frame.remove();
        return;
    }

    doc.open();
    doc.write(`<!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>${options.documentTitle ?? 'Print'}</title>
                <style>${options.style ?? ''}</style>
            </head>
            <body>${options.printable}</body>
        </html>`);
    doc.close();

    const handlePrint = () => {
        frameWindow?.focus();
        frameWindow?.print();
        setTimeout(() => frame.remove(), 1000);
    };

    if (frameWindow) {
        frameWindow.onload = () => {
            setTimeout(handlePrint, 150);
        };
    } else {
        setTimeout(handlePrint, 150);
    }
}
