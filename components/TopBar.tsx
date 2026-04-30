import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

export default function TopBar({ lang }: { lang: "es" | "en" }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 3xl:max-w-7xl">
      <div className="flex items-center justify-end gap-2">
        <LanguageSwitcher lang={lang} />
        <ThemeToggle />
      </div>
    </div>
  );
}
