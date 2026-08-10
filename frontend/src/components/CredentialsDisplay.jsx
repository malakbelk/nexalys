import { useState } from "react";

export default function CredentialsDisplay({ email, password }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `Identifiant NEXALYS :\nEmail: ${email}\nMot de passe temporaire: ${password}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-pop-in relative overflow-hidden rounded-xl border border-[var(--color-signal-deep)]/30 bg-[color-mix(in_srgb,var(--color-signal)_8%,white)] p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--color-signal-deep)]/20 pb-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-signal-deep)]">
          Accès Temporaire Généré
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[var(--color-canvas-line)] px-3 py-1.5 font-mono text-xs font-medium text-[var(--color-ink)] transition-all hover:border-[var(--color-signal-deep)] active:scale-95"
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5 text-[var(--color-band)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Copié !
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 text-[var(--color-ink-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copier les identifiants
            </>
          )}
        </button>
      </div>

      <div className="mt-4 space-y-2.5 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-soft)]">Email :</span>
          <span className="font-semibold text-[var(--color-ink)]">{email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-ink-soft)]">Mot de passe temporaire :</span>
          <span className="rounded bg-white px-2 py-0.5 font-bold tracking-wider text-[var(--color-danger)] border border-[var(--color-danger)]/20">
            {password}
          </span>
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] text-[var(--color-ink-soft)]">
         Note : Ce mot de passe temporaire ne sera plus jamais affiché. Transmettez-le directement à l'utilisateur.
      </p>
    </div>
  );
}