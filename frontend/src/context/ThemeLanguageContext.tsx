import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, type PaletteMode } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/fi';
import 'dayjs/locale/en';

interface ThemeLanguageContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
  language: string;
  changeLanguage: (lang: string) => void;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  language: 'en',
  changeLanguage: () => {},
});

export const useThemeLanguage = () => useContext(ThemeLanguageContext);

export const ThemeLanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();
  
  // Initialize mode from local storage or default to light
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode === 'dark' || savedMode === 'light') ? savedMode : 'light';
  });

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    dayjs.locale(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  // Sync dayjs with current i18n language on mount/change
  useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#6366f1',
          },
          background: {
            default: mode === 'light' ? '#f8fafc' : '#0f172a',
            paper: mode === 'light' ? '#ffffff' : '#1e293b',
          },
        },
      }),
    [mode],
  );

  return (
    <ThemeLanguageContext.Provider value={{ mode, toggleColorMode, language: i18n.language, changeLanguage }}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </ThemeLanguageContext.Provider>
  );
};
