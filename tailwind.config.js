/** @type {import('tailwindcss').Config} */

/**
 * TAILWIND CONFIG — MatchPredict AI
 *
 * El código de v0 (shadcn/ui) usa clases como:
 *   bg-primary, text-muted-foreground, border-border, bg-background, etc.
 *
 * Esas clases NO existen en Tailwind por defecto. Las registramos aquí
 * apuntando a variables CSS (--primary, --background, etc.) que definimos
 * en styles.css.
 *
 * La sintaxis especial "hsl(var(--color) / <alpha-value>)" es la que
 * permite que Tailwind soporte modificadores de opacidad como:
 *   bg-primary/10  →  primary color al 10% de opacidad
 *   bg-black/80    →  negro al 80% de opacidad
 */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Color de fondo general de la app
        background: 'hsl(var(--background) / <alpha-value>)',

        // Color de texto principal
        foreground: 'hsl(var(--foreground) / <alpha-value>)',

        // Color primario (verde esmeralda en nuestro tema)
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },

        // Color secundario (gris azulado oscuro)
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },

        // Color atenuado (para textos secundarios, placeholders)
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },

        // Color de bordes
        border: 'hsl(var(--border) / <alpha-value>)',

        // Color destructivo (rojo, para "Cerrar sesión", errores)
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },

        // Color de fondo de tarjetas (ligeramente más claro que background)
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
