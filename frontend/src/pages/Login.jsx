import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ApiError } from "../api";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn({ email, password });
      navigate("/tableau-de-bord", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Connexion impossible. Vérifiez vos identifiants."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex bg-[var(--color-canvas)]">
      
      {/* --- EFFETS ET ORBES LUMINEUX EN ARRIÈRE-PLAN --- */}
      <div className="absolute top-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--color-signal)]/20 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-[var(--color-band)]/15 blur-3xl animate-pulse [animation-duration:8s] pointer-events-none" />

      {/* --- PANNEAU GAUCHE : Marque & Calibration --- */}
      <div className="grid-canvas relative z-10 hidden w-1/2 flex-col justify-between border-r border-[var(--color-canvas-line)] p-12 lg:flex">
        <div className="flex items-center gap-3 transition-transform duration-300 hover:scale-105 origin-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-ink)] font-mono font-bold text-[var(--color-signal)] shadow-md">
            N
          </div>
          <span className="font-[var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
            NEXALYS
          </span>
        </div>

        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-canvas-line)] bg-white/80 backdrop-blur-md px-3 py-1.5 font-mono text-xs font-medium text-[var(--color-wire)] shadow-xs transition-all hover:shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-band)] animate-ping" />
            Moteur de Calibration Économétrique
          </div>
          
          <h1 className="font-[var(--font-display)] text-4xl font-extrabold leading-tight text-[var(--color-ink)]">
            Mesurez la productivité réelle de votre organisation.
          </h1>
          
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Accédez à vos tableaux de bord d'évaluation, analysez les coefficients agrégés et suivez vos équipes en temps réel.
          </p>
        </div>

        <div className="font-mono text-xs text-[var(--color-ink-soft)]">
          © {new Date().getFullYear()} NEXALYS Ecosystem Platform.
        </div>
      </div>

      {/* --- PANNEAU DROIT : Formulaire de Connexion --- */}
      <div className="relative z-10 flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-[var(--color-canvas-line)] bg-white/80 backdrop-blur-xl p-8 shadow-xl transition-all duration-500 hover:shadow-2xl hover:border-[var(--color-wire)]/30 animate-fade-in">
          
          <div>
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-ink)] font-mono text-sm font-bold text-[var(--color-signal)] shadow-sm">
                N
              </div>
              <span className="font-[var(--font-display)] text-lg font-bold text-[var(--color-ink)]">
                NEXALYS
              </span>
            </div>
            <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">
              Espace de Connexion
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              Saisissez vos identifiants pour accéder à la plateforme.
            </p>
          </div>

          {error && (
            <div role="alert" className="animate-bounce rounded-xl border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_10%,white)] p-4 text-xs font-medium text-[var(--color-danger)] shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Champ Email */}
            <div className="group">
              <label
                htmlFor="email"
                className="block font-mono text-xs font-medium uppercase tracking-wider text-[var(--color-ink-soft)] transition-colors group-focus-within:text-[var(--color-signal-deep)]"
              >
                Adresse Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@entreprise.com"
                className="mt-1.5 w-full rounded-xl border border-[var(--color-canvas-line)] bg-white/50 px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-all duration-300 focus:border-[var(--color-signal-deep)] focus:bg-white focus:ring-2 focus:ring-[var(--color-signal-deep)]/20 focus:shadow-md"
              />
            </div>

            {/* Champ Mot de Passe */}
            <div className="group">
              <label
                htmlFor="password"
                className="block font-mono text-xs font-medium uppercase tracking-wider text-[var(--color-ink-soft)] transition-colors group-focus-within:text-[var(--color-signal-deep)]"
              >
                Mot de Passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-[var(--color-canvas-line)] bg-white/50 px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition-all duration-300 focus:border-[var(--color-signal-deep)] focus:bg-white focus:ring-2 focus:ring-[var(--color-signal-deep)]/20 focus:shadow-md"
              />
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl bg-[var(--color-ink)] py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-[var(--color-ink)]/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Vérification en cours...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}