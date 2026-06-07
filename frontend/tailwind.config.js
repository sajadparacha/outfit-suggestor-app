/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4facfe 0%, #c471ed 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(79, 172, 254, 0.15) 0%, rgba(196, 113, 237, 0.15) 100%)',
        'hero-flatlay': 'linear-gradient(145deg, #1e293b 0%, #0f172a 40%, #312e81 100%)',
      },
      colors: {
        brand: {
          blue: '#4facfe',
          purple: '#c471ed',
          navy: '#0f172a',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#4facfe',
          600: '#4facfe',
          700: '#3d9be8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        teal: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#6bb8fe',
          500: '#4facfe',
          600: '#3d9be8',
          700: '#2d7fd4',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#6A1B9A',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
