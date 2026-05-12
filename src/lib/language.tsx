'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'en' | 'nl'

const translations = {
  en: {
    home: 'Home', standings: 'Standings', live: 'Live', schedule: 'Schedule',
    results: 'Results', leaders: 'Leaders', livestream: 'Livestream',
    news: 'News', rosters: 'Rosters', social: 'Social',
    recentResults: 'Recent Results', standingsTitle: 'Standings', upcoming: 'Upcoming',
    allResults: 'All results →', fullStandings: 'Full →', predict: 'Predict the result →',
    noGames: 'No games scheduled',
  },
  nl: {
    home: 'Home', standings: 'Stand', live: 'Live', schedule: 'Schema',
    results: 'Uitslagen', leaders: 'Leaders', livestream: 'Livestream',
    news: 'Nieuws', rosters: 'Rosters', social: 'Social',
    recentResults: 'Recente Uitslagen', standingsTitle: 'Hoofdklasse Stand', upcoming: 'Aankomend',
    allResults: 'Alle uitslagen →', fullStandings: 'Volledig →', predict: 'Voorspel de uitslag →',
    noGames: 'Geen wedstrijden gepland',
  },
}

type Translations = typeof translations.en
const LanguageContext = createContext<{ lang: Lang; t: Translations; toggle: () => void }>({
  lang: 'en', t: translations.en, toggle: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('hk_lang') as Lang | null
    if (saved === 'nl') setLang('nl')
  }, [])

  const toggle = () => {
    const next: Lang = lang === 'en' ? 'nl' : 'en'
    setLang(next)
    localStorage.setItem('hk_lang', next)
  }

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
