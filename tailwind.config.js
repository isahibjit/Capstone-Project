/** @type {import('tailwindcss').Config} */
export default {
  content: ['./views/**/*.ejs'],
  theme: {
    extend: {
      backgroundColor:{
        'lightGray':'#a9a9a9',
        'hoverBg':'#e67402',
        'bodyBg':'#161616',
        'formBg':'#5a5a5a'
      },
      fontFamily:{
        libre: ['"Libre Baskerville"', 'serif'],
        poppins: ['"Poppins"', 'sans-serif']
      },
      colors:{
        orange:'#e67402'
      }
    },
  },
  plugins: [],
}
