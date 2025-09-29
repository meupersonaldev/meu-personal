'use client'

import { useState, useEffect } from 'react'

export function useTheme() {
  // Forçar modo claro por enquanto
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Sempre forçar modo claro
    setIsDarkMode(false)
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }, [])

  const toggleDarkMode = () => {
    // Desabilitado temporariamente
    console.log('Dark mode desabilitado temporariamente')
  }

  return { isDarkMode, toggleDarkMode }
}
