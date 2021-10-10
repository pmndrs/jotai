const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  purge: {
    layers: ['components', 'utilities'],
    content: [
      './src/**/*.js',
      './src/**/*.json',
      './src/**/*.jsx',
      './src/**/*.ts',
      './src/**/*.tsx',
    ],
  },
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: { ...colors.trueGray, 350: '#bcbcbc' },
      blue: colors.blue,
      yellow: colors.yellow,
    },
    fontSize: {
      '4xs': ['0.375rem'],
      '3xs': ['0.5rem'],
      '2xs': ['0.625rem'],
      xs: ['0.75rem'],
      sm: ['0.875rem'],
      base: ['1rem'],
      lg: ['1.125rem'],
      xl: ['1.25rem'],
      '2xl': ['1.5rem'],
      '3xl': ['1.875rem'],
      '4xl': ['2.25rem'],
      '5xl': ['3rem'],
      '6xl': ['3.75rem'],
      '7xl': ['4.5rem'],
      '8xl': ['6rem'],
      '9xl': ['8rem'],
      '10xl': ['10rem'],
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
