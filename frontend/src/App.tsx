import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import EventPage from './components/EventPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event" element={<EventPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
