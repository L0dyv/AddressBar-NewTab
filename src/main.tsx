import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

type ChromeRuntime = { id?: string }
type ChromeRoot = { runtime?: ChromeRuntime }
type ChromeWindow = { chrome?: ChromeRoot }

if (!window.location.search.includes('focus')) {
    const q = window.location.search
    window.location.search = q ? `${q}&focus` : '?focus'
} else {
    const w = window as unknown as ChromeWindow
    const isExtension = !!w.chrome?.runtime?.id
    if (import.meta.env.DEV && !isExtension && !window.location.search.includes('noreset')) {
        try { localStorage.clear() } catch { void 0 }
    }
    createRoot(document.getElementById('root')!).render(<App />)
}
