import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function temaInicial() {
  const salvo = localStorage.getItem('tema')
  if (salvo === 'dark' || salvo === 'light') return salvo
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    localStorage.setItem('tema', tema)
  }, [tema])

  const alternarTema = () => setTema(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
