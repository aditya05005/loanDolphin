/** @type {import('tailwindcss').Config} */
export default {
  // "class" strategy: dark styles only apply when a `dark` class is present
  // on a parent element (we put it on <html> in App.jsx), instead of always
  // following the OS setting. That's what makes a manual toggle possible.
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
