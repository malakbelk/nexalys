export default function ScoreGauge({ score, label = "Indice de Productivité Calculé" }) {
  // Détermination du statut et de la couleur selon le score (0 - 100%)
  const getStatus = (val) => {
    if (val >= 85) return { text: "Excellente performance", color: "var(--color-band)" };
    if (val >= 70) return { text: "Performance optimale", color: "var(--color-wire)" };
    if (val >= 50) return { text: "Performance moyenne", color: "var(--color-signal-deep)" };
    return { text: "Seuil d'attention requis", color: "var(--color-danger)" };
  };

  const status = getStatus(score);
  const clampedScore = Math.min(Math.max(score, 0), 100);

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {label && (
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)] text-center">
          {label}
        </p>
      )}

      {/* Cadran circulaire d'instrumentation */}
      <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-2 border-[var(--color-canvas-line)] bg-[var(--color-canvas)]/30 shadow-inner">
        {/* Cercle SVG d'indicateur */}
        <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="var(--color-canvas-line)"
            strokeWidth="6"
            fill="transparent"
            className="opacity-40"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke={status.color}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={263.89}
            strokeDashoffset={263.89 - (263.89 * clampedScore) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Valeur centrale */}
        <div className="z-10 text-center animate-pop-in">
          <span className="font-[var(--font-display)] text-4xl font-extrabold text-[var(--color-ink)]">
            {clampedScore.toFixed(1)}
          </span>
          <span className="font-mono text-lg font-bold text-[var(--color-ink-soft)]">%</span>
        </div>
      </div>

      {/* Libellé d'état */}
      <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--color-canvas-line)] bg-white px-3.5 py-1 text-xs font-mono shadow-xs">
        <span
          className="h-2 w-2 rounded-full animate-ping"
          style={{ backgroundColor: status.color }}
        />
        <span className="font-medium text-[var(--color-ink)]">{status.text}</span>
      </div>
    </div>
  );
}