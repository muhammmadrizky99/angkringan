/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fef7ee',
                    100: '#fdedd3',
                    200: '#fad7a5',
                    300: '#f6ba6d',
                    400: '#f19332',
                    500: '#ee7711',
                    600: '#df5d07',
                    700: '#b94409',
                    800: '#93360e',
                    900: '#772f0f',
                    950: '#401505',
                },
                accent: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                    950: '#052e16',
                },
                dark: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out both',
                'fade-in-up': 'fadeInUp 0.5s ease-out both',
                'fade-in-down': 'fadeInDown 0.4s ease-out both',
                'slide-in-right': 'slideInRight 0.5s ease-out both',
                'slide-in-left': 'slideInLeft 0.5s ease-out both',
                'scale-in': 'scaleIn 0.3s ease-out both',
                'float': 'float 3s ease-in-out infinite',
                'shimmer': 'shimmer 1.5s infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    from: { opacity: '0', transform: 'translateY(-16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    from: { opacity: '0', transform: 'translateX(24px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                slideInLeft: {
                    from: { opacity: '0', transform: 'translateX(-24px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            boxShadow: {
                'glow': '0 0 20px rgba(238, 119, 17, 0.15)',
                'glow-accent': '0 0 20px rgba(34, 197, 94, 0.15)',
                'card': '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)',
                'card-hover': '0 4px 24px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(15, 23, 42, 0.04)',
                'button': '0 2px 8px rgba(238, 119, 17, 0.25)',
            },
        },
    },
    plugins: [],
};
