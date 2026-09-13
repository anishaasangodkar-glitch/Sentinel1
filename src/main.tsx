import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './i18n'

const storedAnalysis = sessionStorage.getItem('sentinel-current-analysis')
if (storedAnalysis) {
  try {
    const parsed = JSON.parse(storedAnalysis) as Record<string, unknown>
    const normalized = { ...parsed, id: parsed.id || crypto.randomUUID(), createdAt: parsed.createdAt || new Date().toISOString(), riskDNA: parsed.riskDNA || {}, detectedSignals: parsed.detectedSignals || [], consequences: parsed.consequences || parsed.possibleConsequences || [], recommendedActions: parsed.recommendedActions || [] }
    sessionStorage.setItem('sentinel-current-analysis', JSON.stringify(normalized))
  } catch {
    sessionStorage.removeItem('sentinel-current-analysis')
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>)
