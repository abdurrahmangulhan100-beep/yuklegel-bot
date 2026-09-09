import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zemin tonları — koyu lacivert/siyah kademesi
        ink: {
          950: '#0E1013',
          900: '#14171B',
          800: '#171A1F',
          700: '#1D2127',
          600: '#272B32',
        },
        surface: {
          light: '#EEF0F3',
        },
        // Vurgu turuncusu — CTA ve aktif durumlar
        accent: {
          DEFAULT: '#FF7A29',
          hover: '#E8650F',
          soft: 'rgb(255 122 41 / 0.1)',
        },
        // Güven mavi/gri — rota, sefer ve navigasyon verileri
        trust: {
          DEFAULT: '#3E6B96',
          soft: 'rgb(62 107 150 / 0.1)',
          light: '#7fb0d8',
        },
        // Finans yeşili — pozitif rakamlar, kazanç
        finance: {
          DEFAULT: '#2F9E5B',
          hover: '#267F4A',
          soft: 'rgb(47 158 91 / 0.1)',
        },
        // Uyarı/hata kırmızısı
        danger: {
          DEFAULT: '#C34A36',
          hover: '#A83C2B',
          soft: 'rgb(195 74 54 / 0.1)',
          light: '#e08a7a',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
