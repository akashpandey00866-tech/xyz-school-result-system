import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "xyz-school-theme";
const DEFAULT_THEME = "emerald";
const DEFAULT_MODE = "light";

export const THEME_PRESETS = {
  emerald: {
    name: "Emerald",
    primary: "#059669",
    primaryDark: "#064e3b",
    primaryLight: "#d1fae5",
    accent: "#10b981",
    soft: "#ecfdf5",
  },

  blue: {
    name: "Ocean Blue",
    primary: "#2563eb",
    primaryDark: "#1e3a8a",
    primaryLight: "#dbeafe",
    accent: "#3b82f6",
    soft: "#eff6ff",
  },

  violet: {
    name: "Violet",
    primary: "#7c3aed",
    primaryDark: "#4c1d95",
    primaryLight: "#ede9fe",
    accent: "#8b5cf6",
    soft: "#f5f3ff",
  },

  orange: {
    name: "Orange",
    primary: "#ea580c",
    primaryDark: "#7c2d12",
    primaryLight: "#ffedd5",
    accent: "#f97316",
    soft: "#fff7ed",
  },

  rose: {
    name: "Rose",
    primary: "#e11d48",
    primaryDark: "#881337",
    primaryLight: "#ffe4e6",
    accent: "#f43f5e",
    soft: "#fff1f2",
  },

  indigo: {
    name: "Indigo",
    primary: "#4f46e5",
    primaryDark: "#312e81",
    primaryLight: "#e0e7ff",
    accent: "#6366f1",
    soft: "#eef2ff",
  },

  teal: {
    name: "Teal",
    primary: "#0f766e",
    primaryDark: "#134e4a",
    primaryLight: "#ccfbf1",
    accent: "#14b8a6",
    soft: "#f0fdfa",
  },
};

const ThemeContext = createContext(null);

function getStoredSettings() {
  try {
    const saved = localStorage.getItem(
      STORAGE_KEY
    );

    if (!saved) {
      return {
        theme: DEFAULT_THEME,
        mode: DEFAULT_MODE,
      };
    }

    const parsed = JSON.parse(saved);

    return {
      theme:
        THEME_PRESETS[parsed.theme]
          ? parsed.theme
          : DEFAULT_THEME,

      mode: [
        "light",
        "dark",
        "system",
      ].includes(parsed.mode)
        ? parsed.mode
        : DEFAULT_MODE,
    };
  } catch {
    return {
      theme: DEFAULT_THEME,
      mode: DEFAULT_MODE,
    };
  }
}

function getSystemMode() {
  if (
    typeof window === "undefined"
  ) {
    return "light";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
}) {
  const [settings, setSettings] =
    useState(getStoredSettings);

  const [systemMode, setSystemMode] =
    useState(getSystemMode);

  const activeMode =
    settings.mode === "system"
      ? systemMode
      : settings.mode;

  const preset =
    THEME_PRESETS[settings.theme] ||
    THEME_PRESETS[DEFAULT_THEME];

  /* ------------------------------------------
     SYSTEM THEME
  ------------------------------------------ */

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const updateSystemMode = () => {
      setSystemMode(
        media.matches
          ? "dark"
          : "light"
      );
    };

    updateSystemMode();

    media.addEventListener(
      "change",
      updateSystemMode
    );

    return () => {
      media.removeEventListener(
        "change",
        updateSystemMode
      );
    };
  }, []);

  /* ------------------------------------------
     SAVE
  ------------------------------------------ */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [settings]);

  /* ------------------------------------------
     GLOBAL CSS VARIABLES
  ------------------------------------------ */

  useEffect(() => {
    const root =
      document.documentElement;

    const dark =
      activeMode === "dark";

    const variables = {
      "--school-primary":
        preset.primary,

      "--school-primary-dark":
        preset.primaryDark,

      "--school-primary-light":
        preset.primaryLight,

      "--school-accent":
        preset.accent,

      "--school-soft":
        preset.soft,

      "--school-text":
        dark
          ? "#f8fafc"
          : "#0f172a",

      "--school-muted":
        dark
          ? "#94a3b8"
          : "#64748b",

      "--school-border":
        dark
          ? "#334155"
          : "#e2e8f0",

      "--school-surface":
        dark
          ? "#0f172a"
          : "#ffffff",

      "--school-surface-alt":
        dark
          ? "#020617"
          : "#f8fafc",

      "--school-bg":
        dark
          ? "#020617"
          : "#f8fafc",

      "--school-card":
        dark
          ? "#0f172a"
          : "#ffffff",

      "--school-shadow":
        dark
          ? "0 20px 60px rgba(0,0,0,.35)"
          : "0 20px 60px rgba(15,23,42,.08)",
    };

    Object.entries(
      variables
    ).forEach(
      ([key, value]) => {
        root.style.setProperty(
          key,
          value
        );
      }
    );

    root.dataset.theme =
      settings.theme;

    root.dataset.mode =
      activeMode;

    root.style.colorScheme =
      activeMode;

    document.body.style.background =
      dark
        ? "#020617"
        : "#f8fafc";

    document.body.style.color =
      dark
        ? "#f8fafc"
        : "#0f172a";
  }, [
    preset,
    settings.theme,
    activeMode,
  ]);

  /* ------------------------------------------
     CHANGE THEME
  ------------------------------------------ */

  const setTheme =
    useCallback(
      (themeName) => {
        if (
          !THEME_PRESETS[themeName]
        ) {
          return;
        }

        setSettings(
          (current) => ({
            ...current,
            theme:
              themeName,
          })
        );
      },
      []
    );

  /* ------------------------------------------
     CHANGE LIGHT / DARK / SYSTEM
  ------------------------------------------ */

  const setMode =
    useCallback(
      (mode) => {
        if (
          ![
            "light",
            "dark",
            "system",
          ].includes(mode)
        ) {
          return;
        }

        setSettings(
          (current) => ({
            ...current,
            mode,
          })
        );
      },
      []
    );

  /* ------------------------------------------
     TOGGLE
  ------------------------------------------ */

  const toggleMode =
    useCallback(() => {
      setSettings(
        (current) => ({
          ...current,
          mode:
            current.mode === "dark"
              ? "light"
              : "dark",
        })
      );
    }, []);

  /* ------------------------------------------
     RESET
  ------------------------------------------ */

  const resetTheme =
    useCallback(() => {
      setSettings({
        theme: DEFAULT_THEME,
        mode: DEFAULT_MODE,
      });
    }, []);

  const themes =
    useMemo(
      () =>
        Object.entries(
          THEME_PRESETS
        ).map(
          ([key, value]) => ({
            key,
            ...value,
          })
        ),
      []
    );

  const contextValue =
    useMemo(
      () => ({
        theme:
          settings.theme,

        mode:
          settings.mode,

        activeMode,

        preset,

        themes,

        isDark:
          activeMode === "dark",

        setTheme,

        setMode,

        toggleMode,

        resetTheme,
      }),
      [
        settings.theme,
        settings.mode,
        activeMode,
        preset,
        themes,
        setTheme,
        setMode,
        toggleMode,
        resetTheme,
      ]
    );

  return (
    <ThemeContext.Provider
      value={contextValue}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* ------------------------------------------
   HOOK
------------------------------------------ */

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme() must be used inside ThemeProvider"
    );
  }

  return context;
}

/* ------------------------------------------
   READY-MADE SWITCHER
------------------------------------------ */

export function ThemeSwitcher({
  compact = false,
}) {
  const {
    theme,
    mode,
    activeMode,
    themes,
    setTheme,
    setMode,
  } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <select
        value={theme}
        onChange={(event) =>
          setTheme(
            event.target.value
          )
        }
        title="Change school theme"
        style={{
          minWidth: compact
            ? "100px"
            : "125px",

          padding: "8px 10px",

          borderRadius: "10px",

          border:
            "1px solid var(--school-border)",

          background:
            "var(--school-card)",

          color:
            "var(--school-text)",

          fontSize: "11px",

          fontWeight: 800,

          outline: "none",

          cursor: "pointer",
        }}
      >
        {themes.map(
          (item) => (
            <option
              key={item.key}
              value={item.key}
            >
              {item.name}
            </option>
          )
        )}
      </select>

      <button
        type="button"
        onClick={() =>
          setMode(
            mode === "dark"
              ? "light"
              : "dark"
          )
        }
        title={
          activeMode === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode"
        }
        style={{
          padding: "8px 11px",

          borderRadius: "10px",

          border:
            "1px solid var(--school-border)",

          background:
            "var(--school-card)",

          color:
            "var(--school-text)",

          fontSize: "12px",

          fontWeight: 900,

          cursor: "pointer",
        }}
      >
        {activeMode === "dark"
          ? "☀️"
          : "🌙"}
      </button>
    </div>
  );
}

export default ThemeContext;