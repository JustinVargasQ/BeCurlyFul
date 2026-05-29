/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Be Curlyful · rosa firma refinado (menos candy, más premium) ── */
        rose: {
          50:  '#FCF4F7', 100: '#F8E6EE', 200: '#F1CCDC',
          300: '#E5A8C2', 400: '#D886A4', 500: '#CE6C8D',
          600: '#B25577', 700: '#8C3F5C', 800: '#5C2940',
        },
        /* warm linen / sand — la base "natural" (reemplaza el blanco frío) */
        cream: { 50: '#FFFBF7', 100: '#FAF3EC', 200: '#F1E6DB', 300: '#E7D7C8' },
        /* texto cálido (espresso suave) */
        ink: {
          900: '#231A1B', 700: '#3C2F30', 500: '#6E5F60',
          400: '#938283', 300: '#BBADAD', 200: '#DDD3D2', 100: '#F0EAE8',
        },
        /* acento natural secundario — champaña cálida */
        gold: '#E0A878',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body:    ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:        '0 4px 24px -10px rgba(120,55,80,0.12)',
        'card-hover':'0 18px 48px -16px rgba(120,55,80,0.22)',
        modal:       '0 26px 70px -22px rgba(60,30,45,0.32)',
        btn:         '0 8px 22px -8px rgba(206,108,141,0.50)',
        'btn-hover': '0 12px 30px -8px rgba(206,108,141,0.60)',
        soft:        '0 2px 18px -8px rgba(120,55,80,0.12)',
      },
      borderRadius: {
        xl2: '1.25rem', xl3: '1.5rem', xl4: '2rem',
        blob:  '42% 58% 58% 42% / 45% 45% 55% 55%',
        blob2: '58% 42% 38% 62% / 52% 48% 52% 48%',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%':   { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-18px)' },
        },
        /* morfeo orgánico — formas que evocan rizos */
        blob: {
          '0%, 100%': { borderRadius: '42% 58% 58% 42% / 45% 45% 55% 55%' },
          '50%':      { borderRadius: '58% 42% 45% 55% / 55% 55% 45% 45%' },
        },
        'orb-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '0.75', transform: 'scale(1.18)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':      { transform: 'scale(1.05)', opacity: '0.85' },
        },
        'wa-ring': {
          '0%':   { transform: 'scale(1)', opacity: '0.55' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        'toast-in': {
          '0%':   { transform: 'translateX(24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
      },
      animation: {
        'fade-up':   'fade-up 0.6s cubic-bezier(.3,1,.3,1) both',
        'fade-in':   'fade-in 0.5s ease both',
        'shimmer':   'shimmer 2s linear infinite',
        'marquee':         'marquee 30s linear infinite',
        'marquee-reverse': 'marquee-reverse 38s linear infinite',
        'float':      'float 4s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'blob':       'blob 14s ease-in-out infinite',
        'orb-pulse':  'orb-pulse 5s ease-in-out infinite',
        'breathe':    'breathe 3s ease-in-out infinite',
        'wa-ring':    'wa-ring 2s ease-out infinite',
        'slide-in-right': 'slide-in-right 0.25s ease-out both',
        'toast-in':       'toast-in 0.2s ease-out both',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(.3,1,.3,1)',
        'snappy': 'cubic-bezier(.4,0,.2,1)',
      },
    },
  },
  plugins: [],
};
