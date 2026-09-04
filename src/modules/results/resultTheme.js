export const RESULT_THEMES = {
  emerald: {
    primary: "#059669",
    dark: "#064e3b",
    soft: "#ecfdf5",
    text: "#047857",
  },
  blue: {
    primary: "#2563eb",
    dark: "#1e3a8a",
    soft: "#eff6ff",
    text: "#1d4ed8",
  },
  violet: {
    primary: "#7c3aed",
    dark: "#4c1d95",
    soft: "#f5f3ff",
    text: "#6d28d9",
  },
  orange: {
    primary: "#ea580c",
    dark: "#7c2d12",
    soft: "#fff7ed",
    text: "#c2410c",
  },
  rose: {
    primary: "#e11d48",
    dark: "#881337",
    soft: "#fff1f2",
    text: "#be123c",
  },
};

export const RESULT_THEME_STORAGE_KEY = "studentResultTheme";

export function applyResultTheme(themeName) {
  const theme =
    RESULT_THEMES[themeName] || RESULT_THEMES.emerald;

  document.documentElement.style.setProperty(
    "--student-primary",
    theme.primary
  );
  document.documentElement.style.setProperty(
    "--student-dark",
    theme.dark
  );
  document.documentElement.style.setProperty(
    "--student-soft",
    theme.soft
  );
  document.documentElement.style.setProperty(
    "--student-text",
    theme.text
  );

  return theme;
}
