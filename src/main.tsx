import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 新标签页聚焦修复
if (!window.location.search.includes('focus')) {
    const q = window.location.search
    window.location.search = q ? `${q}&focus` : '?focus'
} else {
    createRoot(document.getElementById('root')!).render(<App />)
}
