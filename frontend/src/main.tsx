import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
    },
    background: {
      default: '#f8fafc',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
