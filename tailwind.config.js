/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Be Curlyful Brand — hot pink + white
        rose: {
          50:  '#FFF0F7', 100: '#FCE4EC', 200: '#F8BBD0',
          300: '#F48FB1', 400: '#F06292', 500: '#E879A0',
          600: '#C9547E', 700: '#A63C62',
        },
        ink: {
          900: '#1A1414', 700: '#2E2626', 500: '#6B5F5F',
          400: '#8E8383', 300: '#B8AFAF', 200: '#D8D1D1', 100: '#EFEAEA',
        },
        cream: { 50: '#FFF8FC', 100: '#FFF0F7', 200: '#FFD6EC' },
        gold: '#F472B6',
      },
      fontFamily: {
        display: ['"Nunito"', 'system-ui', 'sans-serif'],
        body:    ['"Poppins"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 2px 16px 0 rgba(26,20,20,0.07)',
        'card-hover': '0 8px 32px 0 rgba(26,20,20,0.14)',
        modal:   '0 8px 48px 0 rgba(26,20,20,0.18)',
        btn:     '0 2px 8px 0 rgba(236,72,153,0.25)',
        'btn-hover': '0 4px 16px 0 rgba(236,72,153,0.4)',
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.5rem' },
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
        'float':     'float 4s ease-in-out infinite',
        'orb-pulse': 'orb-pulse 5s ease-in-out infinite',
        'breathe':   'breathe 3s ease-in-out infinite',
        'wa-ring':   'wa-ring 2s ease-out infinite',
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
