import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, type PaletteMode } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/fi';
import 'dayjs/locale/en';

import { ThemeLanguageContext } from './ThemeLanguageContext';

export const ThemeLanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();

  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode === 'dark' || savedMode === 'light' ? savedMode : 'light';
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

  useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#6d28d9' : '#a78bfa',
          },
          secondary: {
            main: mode === 'light' ? '#c2410c' : '#fb923c',
          },
          text: {
            primary: mode === 'light' ? '#121826' : '#e5e7eb',
            secondary: mode === 'light' ? '#4b5563' : '#a1a1aa',
          },
          background: {
            default: mode === 'light' ? '#fbf7f2' : '#0b1020',
            paper: mode === 'light' ? '#ffffff' : '#121a33',
          },
        },
        shape: {
          borderRadius: 16,
        },
        typography: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          h1: {
            fontWeight: 800,
            fontSize: '3.5rem',
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
          },
          h2: {
            fontWeight: 800,
            fontSize: '2.5rem',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          },
          h3: {
            fontWeight: 800,
            fontSize: '2.0rem',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          },
          h4: {
            fontWeight: 800,
            fontSize: '1.6rem',
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
          },
          h5: {
            fontWeight: 800,
            fontSize: '1.25rem',
            lineHeight: 1.25,
          },
          h6: {
            fontWeight: 800,
            fontSize: '1.05rem',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          },
          subtitle1: {
            fontWeight: 600,
          },
          body1: {
            fontWeight: 300,
            fontSize: '1rem',
            lineHeight: 1.6,
          },
          body2: {
            fontWeight: 300,
            fontSize: '0.95rem',
            lineHeight: 1.6,
          },
          button: {
            fontWeight: 800,
            letterSpacing: '0.02em',
            lineHeight: 1.15,
            textTransform: 'none',
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                textRendering: 'geometricPrecision',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                backgroundImage:
                  mode === 'light'
                    ? 'radial-gradient(1200px 800px at 20% -10%, rgba(109, 40, 217, 0.12), transparent 60%), radial-gradient(900px 700px at 90% 10%, rgba(194, 65, 12, 0.10), transparent 55%)'
                    : 'radial-gradient(1200px 800px at 20% -10%, rgba(167, 139, 250, 0.14), transparent 60%), radial-gradient(900px 700px at 90% 10%, rgba(251, 146, 60, 0.12), transparent 55%)',
              },
              a: {
                color: 'inherit',
                textDecorationColor:
                  mode === 'light' ? 'rgba(109, 40, 217, 0.45)' : 'rgba(167, 139, 250, 0.55)',
                textUnderlineOffset: '0.18em',
                textDecorationThickness: '1px',
              },
              'a:hover': {
                textDecorationColor:
                  mode === 'light' ? 'rgba(194, 65, 12, 0.55)' : 'rgba(251, 146, 60, 0.65)',
              },
              '::selection': {
                background:
                  mode === 'light' ? 'rgba(109, 40, 217, 0.18)' : 'rgba(167, 139, 250, 0.22)',
              },
              code: {
                fontFamily: '"JetBrains Mono", monospace',
              },
              pre: {
                fontFamily: '"JetBrains Mono", monospace',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border:
                  mode === 'light'
                    ? '1px solid rgba(18, 24, 38, 0.08)'
                    : '1px solid rgba(229, 231, 235, 0.10)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                borderBottom:
                  mode === 'light'
                    ? '1px solid rgba(18, 24, 38, 0.08)'
                    : '1px solid rgba(229, 231, 235, 0.10)',
              },
            },
          },
          MuiButton: {
            defaultProps: {
              disableElevation: true,
            },
            styleOverrides: {
              root: {
                borderRadius: 999,
                paddingInline: 18,
                paddingBlock: 10,
                lineHeight: 1.15,
              },
              sizeSmall: {
                paddingInline: 14,
                paddingBlock: 7,
              },
              sizeLarge: {
                paddingInline: 22,
                paddingBlock: 12,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 600,
                height: 'auto',
                paddingBlock: 4,
              },
              label: {
                paddingTop: 2,
                paddingBottom: 2,
                lineHeight: 1.15,
              },
            },
          },
          MuiCardContent: {
            styleOverrides: {
              root: {
                paddingLeft: 24,
                paddingRight: 24,
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              variant: 'outlined',
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 16,
              },
              input: {
                lineHeight: 1.25,
                paddingTop: 14,
                paddingBottom: 14,
              },
              inputSizeSmall: {
                paddingTop: 10,
                paddingBottom: 10,
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ThemeLanguageContext.Provider
      value={{ mode, toggleColorMode, language: i18n.language, changeLanguage }}
    >
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
          <CssBaseline />
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </ThemeLanguageContext.Provider>
  );
};
