import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeLanguageProvider } from './context/ThemeLanguageProvider'
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeLanguageProvider>
      <App />
    </ThemeLanguageProvider>
  </React.StrictMode>,
)
