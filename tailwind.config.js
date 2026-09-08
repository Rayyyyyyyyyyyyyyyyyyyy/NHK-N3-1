export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: ['variant', '&:where(:not(*))'],
  corePlugins: { preflight: false },
  theme: {
    colors: {
      transparent: 'transparent',
      white: '#fff',
      black: '#000',
      indigo: '#1B3A5C',
      'indigo-deep': '#0F2438',
      paper: '#F6F7F5',
      ink: '#20242B',
      border: '#DDE3E6',
      vermilion: '#C73E2E',
      green: '#2E7D52',
      muted: '#8892a0',
      subtle: '#5b6470',
      'correct-bg': '#EAF5EE',
      'wrong-bg': '#FBEAE7',
    },
    extend: {
      fontFamily: {
        serif: ['Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif TC', 'Songti TC', 'serif'],
      },
      spacing: {
        'safe-top': 'calc(22px + env(safe-area-inset-top, 0px))',
        'safe-bottom': 'calc(72px + env(safe-area-inset-bottom, 0px))',
        'nav-safe': 'env(safe-area-inset-bottom, 0px)',
      },
      maxWidth: { dojo: '520px' },
    },
  },
}
