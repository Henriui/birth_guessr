import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import EventPage from './components/EventPage'
import PrivacyPolicy from './components/PrivacyPolicy'
import Navbar from './components/Navbar'
import { CookieBanner } from './components/CookieBanner'
import { Footer } from './components/Footer'
import { Box } from '@mui/material'

function App() {
  return (
    <BrowserRouter>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/event" element={<EventPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Box>
        <Footer />
        <CookieBanner />
      </Box>
    </BrowserRouter>
  )
}

export default App
