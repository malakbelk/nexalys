import { useEffect, useState } from "react";

// Termes reels tires du modele "grande entreprise -- productivite globale"
// du brevet (coefficients de regression). Fait defiler pour ancrer le
// panneau dans la vraie recherche plutot que dans une decoration generique.
const COEFFICIENTS = [
  "+ 0,874 acces a l'information",
  "− 7,53 reactivite",
  "+ 4,80 absenteisme",
  "+ 3,30 remuneration",
  "− 23,70 competence",
  "+ 6,34 comportement",
];

const POINTS = [
  [60, 104],
  [100, 76],
  [140, 130],
  [180, 60],
  [220, 94],
  [260, 144],
  [300, 80],
  [340, 110],
];

export default function BrandPanel() {
  const [readoutIndex, setReadoutIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setReadoutIndex((i) => (i + 1) % COEFFICIENTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const polylinePoints = POINTS.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = POINTS[POINTS.length - 1];

  return (
    <div className="grid-canvas relative flex h-full flex-col justify-between overflow-hidden bg-[var(--color-canvas)] px-10 py-12 lg:px-14">
      {/* Eyebrow + wordmark */}
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
          NEXALYS — Modele de productivite du travail
        </p>
        <h1 className="mt-4 font-[var(--font-display)] text-5xl font-medium leading-[0.95] text-[var(--color-ink)] lg:text-6xl">
          Mesurer ce qui
          <br />
          fait avancer une
          <br />
          <span className="italic text-[var(--color-signal-deep)]">equipe.</span>
        </h1>
      </div>

      {/* Calibration trace -- signature element */}
      <div className="relative">
        <svg
          viewBox="0 0 400 240"
          className="w-full max-w-md"
          role="img"
          aria-label="Trace de calibration montrant des lectures de productivite comprises entre 30% et 87%"
        >
          {/* bande valide 30-87% */}
          <rect x="40" y="46" width="340" height="114" fill="var(--color-wire)" opacity="0.08" />
          <line x1="40" y1="46" x2="380" y2="46" stroke="var(--color-canvas-line)" strokeWidth="1" strokeDasharray="3 4" />
          <line x1="40" y1="160" x2="380" y2="160" stroke="var(--color-canvas-line)" strokeWidth="1" strokeDasharray="3 4" />
          <text x="384" y="49" className="font-mono" fontSize="11" fill="var(--color-ink-soft)">87%</text>
          <text x="384" y="163" className="font-mono" fontSize="11" fill="var(--color-ink-soft)">30%</text>

          {/* trace */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="var(--color-signal-deep)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="trace-path"
            style={{ "--trace-length": 460 }}
          />
          {POINTS.slice(0, -1).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--color-ink)" opacity="0.35" />
          ))}
          {/* lecture actuelle */}
          <circle cx={lastX} cy={lastY} r="4.5" fill="var(--color-signal)" />
          <circle cx={lastX} cy={lastY} r="4.5" fill="var(--color-signal)" className="reading-pulse" />
        </svg>

        <div className="mt-3 h-5 font-mono text-[12px] text-[var(--color-wire)]">
          <span key={readoutIndex} className="inline-block" style={{ animation: "readout-fade 2.8s ease-in-out" }}>
            {COEFFICIENTS[readoutIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}