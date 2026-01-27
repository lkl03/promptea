import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

function LoginIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.21 4.21 0 0 0 12 12Zm0 2c-4.2 0-7.6 2.3-7.6 5.1A1.9 1.9 0 0 0 6.3 21h11.4a1.9 1.9 0 0 0 1.9-1.9c0-2.8-3.4-5.1-7.6-5.1Z"
      />
    </svg>
  );
}

export default function TopBar({ lang }: { lang: "es" | "en" }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 3xl:max-w-7xl">
      <div className="flex items-center justify-end gap-2">
        {/* Login (sin función por ahora) 
        <button type="button" className="btn-icon" aria-label="Login">
          <LoginIcon className="h-4 w-4" />
        </button>*/}

        <LanguageSwitcher lang={lang} />
        {/*<ThemeToggle />*/}
      </div>
    </div>
  );
}
