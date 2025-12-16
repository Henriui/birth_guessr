import { createContext, useContext } from 'react';
import type { PaletteMode } from '@mui/material';

interface ThemeLanguageContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
  language: string;
  changeLanguage: (lang: string) => void;
}

 export const ThemeLanguageContext = createContext<ThemeLanguageContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  language: 'en',
  changeLanguage: () => {},
});

export const useThemeLanguage = () => useContext(ThemeLanguageContext);
