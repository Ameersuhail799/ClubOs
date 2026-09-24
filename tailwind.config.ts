import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary & Brand (Muted Institutional Slate Green)
        primary: {
          DEFAULT: "var(--color-primary, #153328)",
          container: "var(--color-primary-container, #2c4a3e)",
          fixed: "var(--color-primary-fixed, #c8eada)",
          "fixed-dim": "var(--color-primary-fixed-dim, #adcebe)",
        },
        "on-primary": {
          DEFAULT: "var(--color-on-primary, #ffffff)",
          container: "var(--color-on-primary-container, #98b9a9)",
          fixed: "var(--color-on-primary-fixed, #012016)",
          "fixed-variant": "var(--color-on-primary-fixed-variant, #2f4d41)",
        },

        // Secondary & Neutrals
        secondary: {
          DEFAULT: "var(--color-secondary, #5d5f5a)",
          container: "var(--color-secondary-container, #e2e3dc)",
          fixed: "var(--color-secondary-fixed, #e2e3dc)",
          "fixed-dim": "var(--color-secondary-fixed-dim, #c6c7c1)",
        },
        "on-secondary": {
          DEFAULT: "var(--color-on-secondary, #ffffff)",
          container: "var(--color-on-secondary-container, #636560)",
          fixed: "var(--color-on-secondary-fixed, #1a1c18)",
          "fixed-variant": "var(--color-on-secondary-fixed-variant, #454743)",
        },

        // Tertiary
        tertiary: {
          DEFAULT: "var(--color-tertiary, #023522)",
          container: "var(--color-tertiary-container, #1f4c37)",
          fixed: "var(--color-tertiary-fixed, #bceed1)",
          "fixed-dim": "var(--color-tertiary-fixed-dim, #a1d1b5)",
        },
        "on-tertiary": {
          DEFAULT: "var(--color-on-tertiary, #ffffff)",
          container: "var(--color-on-tertiary-container, #8cbca0)",
          fixed: "var(--color-on-tertiary-fixed, #002113)",
          "fixed-variant": "var(--color-on-tertiary-fixed-variant, #224f3a)",
        },

        // Surfaces & Backgrounds (Warm Editorial Paper / Bone)
        background: "var(--color-background, #fbf9f5)",
        surface: {
          DEFAULT: "var(--color-surface, #fbf9f5)",
          dim: "var(--color-surface-dim, #dbdad6)",
          bright: "var(--color-surface-bright, #fbf9f5)",
          variant: "var(--color-surface-variant, #e4e2df)",
          "container-lowest": "var(--color-surface-container-lowest, #ffffff)",
          "container-low": "var(--color-surface-container-low, #f5f3f0)",
          container: "var(--color-surface-container, #efeeea)",
          "container-high": "var(--color-surface-container-high, #e9e8e4)",
          "container-highest": "var(--color-surface-container-highest, #e4e2df)",
        },

        // Text & Inks
        "on-background": "var(--color-on-background, #1b1c1a)",
        "on-surface": {
          DEFAULT: "var(--color-on-surface, #1b1c1a)",
          variant: "var(--color-on-surface-variant, #414845)",
        },

        // Hairlines & Outlines
        outline: {
          DEFAULT: "var(--color-outline, #727974)",
          variant: "var(--color-outline-variant, #c1c8c3)",
        },

        // Inverted
        inverse: {
          surface: "var(--color-inverse-surface, #30312e)",
          "on-surface": "var(--color-inverse-on-surface, #f2f1ed)",
          primary: "var(--color-inverse-primary, #adcebe)",
        },

        // Semantic Alerts
        error: {
          DEFAULT: "var(--color-error, #ba1a1a)",
          container: "var(--color-error-container, #ffdad6)",
        },
        "on-error": {
          DEFAULT: "var(--color-on-error, #ffffff)",
          container: "var(--color-on-error-container, #93000a)",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },

      fontSize: {
        "display-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em" }],
        "headline-sm": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
        "body-lg": ["15px", { lineHeight: "24px", letterSpacing: "-0.005em" }],
        "body-md": ["13px", { lineHeight: "20px", letterSpacing: "0em" }],
        "body-sm": ["12px", { lineHeight: "18px", letterSpacing: "0em" }],
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.06em" }],
        "label-code-md": ["12px", { lineHeight: "16px", letterSpacing: "-0.01em" }],
        "label-code-sm": ["11px", { lineHeight: "14px", letterSpacing: "0em" }],
      },

      spacing: {
        "space-xs": "0.25rem", // 4px
        "space-sm": "0.5rem",  // 8px
        "space-md": "0.75rem", // 12px
        "space-lg": "1.25rem", // 20px
        "space-xl": "2rem",    // 32px
        margin: "1.5rem",      // 24px
        "margin-lg": "2.5rem", // 40px
        gutter: "1rem",        // 16px
      },

      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
      },

      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
