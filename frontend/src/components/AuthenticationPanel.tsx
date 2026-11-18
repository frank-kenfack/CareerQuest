import { FormEvent, useState } from "react";
import { StudentProfile } from "../types/careerquest";

interface AuthenticationPanelProps {
  apiBaseUrl: string;
  onAuthenticated: (studentProfile: StudentProfile, accessToken: string) => void;
}

export default function AuthenticationPanel({
  apiBaseUrl,
  onAuthenticated,
}: AuthenticationPanelProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("Epitech Digital");
  const [schoolCity, setSchoolCity] = useState("Paris");
  const [githubUsername, setGithubUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (authMode === "register") {
        const registerResponse = await fetch(`${apiBaseUrl}/auth/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            password,
            school_name: schoolName,
            school_city: schoolCity,
            github_username: githubUsername,
          }),
        });

        const registerPayload = await registerResponse.json();
        if (!registerResponse.ok) {
          const detailText =
            registerPayload.username?.[0] ||
            registerPayload.email?.[0] ||
            registerPayload.password?.[0] ||
            "Échec de l'inscription. Vérifiez les champs saisis.";
          throw new Error(detailText);
        }

        onAuthenticated(
          registerPayload.student as StudentProfile,
          registerPayload.tokens.access as string
        );
      } else {
        const loginResponse = await fetch(`${apiBaseUrl}/auth/login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const loginPayload = await loginResponse.json();
        if (!loginResponse.ok) {
          throw new Error("Identifiants incorrects.");
        }

        const accessToken = loginPayload.access as string;
        const profileResponse = await fetch(`${apiBaseUrl}/auth/me/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!profileResponse.ok) {
          throw new Error("Impossible de charger le profil étudiant.");
        }

        const profilePayload = (await profileResponse.json()) as StudentProfile;
        onAuthenticated(profilePayload, accessToken);
      }
    } catch (submissionError) {
      if (submissionError instanceof Error) {
        setErrorMessage(submissionError.message);
      } else {
        setErrorMessage("Une erreur réseau est survenue.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      data-testid="auth-panel"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            Portail Joueur CareerQuest (JWT)
          </h3>
          <p className="text-xs text-slate-400">
            Créez un profil étudiant pour générer votre avatar niveau 1 ou connectez-vous à votre session.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            data-testid="tab-register"
            onClick={() => {
              setAuthMode("register");
              setErrorMessage(null);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              authMode === "register"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Inscription
          </button>
          <button
            type="button"
            data-testid="tab-login"
            onClick={() => {
              setAuthMode("login");
              setErrorMessage(null);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              authMode === "login"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Connexion
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="auth-username"
              className="block text-xs font-medium text-slate-300"
            >
              Nom d'utilisateur
            </label>
            <input
              id="auth-username"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ex. frank_devops"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {authMode === "register" && (
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-slate-300"
              >
                Adresse e-mail
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ex. frank@careerquest.fr"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-slate-300"
            >
              Mot de passe (8 caractères min.)
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {authMode === "register" && (
            <>
              <div>
                <label
                  htmlFor="auth-school"
                  className="block text-xs font-medium text-slate-300"
                >
                  École ou campus
                </label>
                <input
                  id="auth-school"
                  type="text"
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="Epitech Digital"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-city"
                  className="block text-xs font-medium text-slate-300"
                >
                  Ville
                </label>
                <input
                  id="auth-city"
                  type="text"
                  value={schoolCity}
                  onChange={(event) => setSchoolCity(event.target.value)}
                  placeholder="Paris"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-github"
                  className="block text-xs font-medium text-slate-300"
                >
                  Identifiant GitHub
                </label>
                <input
                  id="auth-github"
                  type="text"
                  value={githubUsername}
                  onChange={(event) => setGithubUsername(event.target.value)}
                  placeholder="frank-kenfack"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {errorMessage && (
          <p
            data-testid="auth-error"
            className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-300"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="auth-submit-button"
            className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting
              ? "Traitement..."
              : authMode === "register"
                ? "Créer mon compte et mon Avatar"
                : "Se connecter"}
          </button>
        </div>
      </form>
    </section>
  );
}
