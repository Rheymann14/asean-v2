export type CertificateData = {
    eventName: string;
    eventDate: string;
    givenDate: string;
    venue: string;
    signatoryName: string;
    signatoryTitle: string;
    signatorySignature?: string | null;
};

export type CertificateParticipant = {
    name: string;
};

export const CERTIFICATE_PRINT_STYLES = `
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: "Times New Roman", serif; color: #111; margin: 0; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto 12mm; display: flex; flex-direction: column; gap: 10mm; }
    .certificate { flex: 1; border: 1px solid #e5e7eb; padding: 10mm; display: flex; flex-direction: column; justify-content: center; }
    .certificate--appearance {
        background: url('/img/appearance_bg.png') center/cover no-repeat;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .certificate--participation {
        background:
            linear-gradient(rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.6)),
            url('/img/bg2.png') center/cover no-repeat;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
  /* Appearance: single logo */
.certificate-logo { display: block; max-width: 100%; margin: 0 auto 10px; }
.certificate-logo--appearance { max-height: 64px; }

/* Participation: stacked logos */
.certificate-logo-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin: 0 auto 10px;
}

.certificate-logo-stack img {
    display: block;
    max-width: 100%;
    height: auto;
}

.certificate-logo--asean-he { max-height: 52px; }   /* top */
.certificate-logo--participation { max-height: 54px; } /* bottom (your existing ASEAN/CHED logo) */


    .title { text-align: center; font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 10px 0 14px; }
    .subtitle { text-align: center; font-size: 14px; margin-bottom: 4px; }
    .lead { text-align: center; font-size: 15px; margin-top: 6px; }
    .recipient { text-align: center; font-size: 20px; font-weight: 700; margin-top: 6px; }
    .text { text-align: center; font-size: 15px; line-height: 1.6; margin: 10px auto 0; max-width: 620px; }
    .value { font-weight: 700; }
    .given { text-align: center; font-size: 14px; margin-top: 16px; }
    .signatory { margin-top: 24px; text-align: center; }
    .signatory-signature { display: block; margin: 0 auto -6px; max-height: 60px; object-fit: contain; }
    .sign-name { font-size: 15px; font-weight: 700; }
    .sign-title { font-size: 13px; }
    .page:last-child { margin-bottom: 0; }
    @media print {
        .page { margin: 0 auto; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
    }
`;

function renderCertificate({
    data,
    participantName,
    type,
}: {
    data: CertificateData;
    participantName: string;
    type: 'appearance' | 'participation';
}) {
    const typeTitle = type === 'appearance' ? 'CERTIFICATE OF APPEARANCE' : 'CERTIFICATE OF PARTICIPATION';
    const lead = type === 'appearance' ? 'This is to certify that' : 'This certificate is hereby given to';
    const body =
        type === 'appearance'
            ? `has appeared during the conduct of <span class="value">${data.eventName}</span> on <span class="value">${data.eventDate}</span> at <span class="value">${data.venue}</span>.`
            : `for actively participating in <span class="value">${data.eventName}</span> on <span class="value">${data.eventDate}</span> at <span class="value">${data.venue}</span>.`;

    const logoHtml =
        type === 'appearance'
            ? `<img class="certificate-logo certificate-logo--appearance" src="/img/ched_logo_bagong_pilipinas.png" alt="" />`
            : `
                <div class="certificate-logo-stack">
                    <img class="certificate-logo--asean-he" src="/img/asean_logo_he.png" alt="" />
                    <img class="certificate-logo--participation" src="/img/ched_logo_bagong_pilipinas_asean.png" alt="" />
                </div>
            `;

    return `
        <section class="certificate certificate--${type}">
            ${logoHtml}
            <div class="title">${typeTitle}</div>
            <div class="lead">${lead}</div>
            <div class="recipient">${participantName}</div>
            <div class="text">${body}</div>
            <div class="given">Given this ${data.givenDate} at ${data.venue}.</div>
            <div class="signatory">
                ${data.signatorySignature ? `<img class="signatory-signature" src="${data.signatorySignature}" alt="Signature" />` : ''}
                <div class="sign-name">${data.signatoryName}</div>
                <div class="sign-title">${data.signatoryTitle}</div>
            </div>
        </section>
    `;
}

function toUpperName(name: string) {
    return (name ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleUpperCase('en-PH');
}


export function buildCertificatePrintBody({
    data,
    participants,
    types = ['appearance', 'participation'],
}: {
    data: CertificateData;
    participants: CertificateParticipant[];
    types?: Array<'appearance' | 'participation'>;
}) {
    return participants
        .map((participant) => {
            const certificates = types
                .map((type) =>
                    renderCertificate({
                        data,
                        participantName: toUpperName(participant.name),
                        type,
                    }),
                )
                .join('');
            return `
                <div class="page">
                    ${certificates}
                </div>
            `;
        })
        .join('');
}
