// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // This is the key!
  theme: {
    extend: {
      colors: {
        // We define your custom dark color here
        'zeta-dark': '#000a40',
      },
    },
  },
  plugins: [],
}