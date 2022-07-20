/* eslint-disable @typescript-eslint/no-var-requires */
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.js', './src/**/*.jsx', './src/**/*.ts', './src/**/*.tsx'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: {
        ...colors.neutral,
        350: '#bcbcbc',
        650: '#494949',
        950: '#0c0c0c',
      },
      blue: { ...colors.blue, 950: '#0f1d45' },
      red: { ...colors.red, 950: '#400f0f' },
      teal: { ...colors.teal, 950: '#0a2725' },
    },
    fontSize: {
      'xs': ['0.75rem'],
      'sm': ['0.875rem'],
      'base': ['1rem'],
      'lg': ['1.125rem'],
      'xl': ['1.25rem'],
      '2xl': ['1.5rem'],
      '3xl': ['1.875rem'],
      '4xl': ['2.25rem'],
      '5xl': ['3rem'],
      '6xl': ['3.75rem'],
      '7xl': ['4.5rem'],
      '8xl': ['6rem'],
      '9xl': ['8rem'],
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
