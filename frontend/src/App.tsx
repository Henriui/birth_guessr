import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import EventPage from './components/EventPage'
import Navbar from './components/Navbar'
import { Box } from '@mui/material'

function App() {
  return (
    <BrowserRouter>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/event" element={<EventPage />} />
        </Routes>
      </Box>
    </BrowserRouter>
  )
}

export default App
