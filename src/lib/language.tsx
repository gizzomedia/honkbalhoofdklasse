'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'en' | 'nl'

const translations = {
  en: {
    home: 'Home', standings: 'Standings', live: 'Live', schedule: 'Schedule',
    results: 'Results', leaders: 'Leaders', livestream: 'Livestream',
    news: 'News', rosters: 'Rosters', social: 'Social', awards: 'Awards',
    recentResults: 'Recent Results', standingsTitle: 'Standings', upcoming: 'Upcoming',
    allResults: 'All results →', fullStandings: 'Full →', predict: 'Predict the result →',
    noGames: 'No games scheduled',
    newsLabel: 'News →', media: 'Media', allMedia: 'All media →',
    allLeaders: 'All leaders →', currentLeader: 'Current Leader', fullStandingsBtn: 'Full Standings',
    final: 'Final', leader: 'Leader',
    battingAvg: 'Batting AVG',
  },
  nl: {
    home: 'Home', standings: 'Stand', live: 'Live', schedule: 'Schema',
    results: 'Uitslagen', leaders: 'Leaders', livestream: 'Livestream',
    news: 'Nieuws', rosters: 'Rosters', social: 'Social', awards: 'Awards',
    recentResults: 'Recente Uitslagen', standingsTitle: 'Stand', upcoming: 'Aankomend',
    allResults: 'Alle uitslagen →', fullStandings: 'Volledig →', predict: 'Voorspel de uitslag →',
    noGames: 'Geen wedstrijden gepland',
    newsLabel: 'Nieuws →', media: 'Media', allMedia: 'Alle media →',
    allLeaders: 'Alle leaders →', currentLeader: 'Huidige Leider', fullStandingsBtn: 'Volledige Stand',
    final: 'Definitief', leader: 'Leider',
    battingAvg: 'Slaggemiddelde',
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
