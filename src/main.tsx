import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if (!window.location.search.includes('focus')) {
    const q = window.location.search
    window.location.search = q ? `${q}&focus` : '?focus'
} else {
    const isExtension = !!(window as any).chrome && !!(window as any).chrome.runtime && !!(window as any).chrome.runtime.id
    if (import.meta.env.DEV && !isExtension && !window.location.search.includes('noreset')) {
        try { localStorage.clear() } catch { }
    }
    createRoot(document.getElementById('root')!).render(<App />)
}
