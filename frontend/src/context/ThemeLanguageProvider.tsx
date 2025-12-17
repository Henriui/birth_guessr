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
            main: mode === 'light' ? '#2E6F5E' : '#7AD7BE',
          },
          secondary: {
            main: mode === 'light' ? '#7B2CBF' : '#C9A1FF',
          },
          text: {
            primary: mode === 'light' ? '#171717' : '#F1F0EE',
            secondary: mode === 'light' ? '#4A4A4A' : '#B9B7B2',
          },
          background: {
            default: mode === 'light' ? '#FBF4E8' : '#0E1110',
            paper: mode === 'light' ? '#FFFDF8' : '#151A18',
          },
        },
        shape: {
          borderRadius: 16,
        },
        typography: {
          fontFamily: '"Recursive", sans-serif',
          h1: {
            fontFamily: '"Fraunces", serif',
            fontWeight: 800,
            fontSize: '3.5rem',
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
          },
          h2: {
            fontFamily: '"Fraunces", serif',
            fontWeight: 800,
            fontSize: '2.5rem',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          },
          h3: {
            fontFamily: '"Fraunces", serif',
            fontWeight: 800,
            fontSize: '2.0rem',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          },
          h4: {
            fontFamily: '"Fraunces", serif',
            fontWeight: 800,
            fontSize: '1.6rem',
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
          },
          h5: {
            fontFamily: '"Fraunces", serif',
            fontWeight: 800,
            fontSize: '1.25rem',
            lineHeight: 1.25,
          },
          h6: {
            fontFamily: '"Fraunces", serif',
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
              '@keyframes paperReveal': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(14px)',
                  filter: 'blur(2px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0px)',
                  filter: 'blur(0px)',
                },
              },
              '.paper-reveal': {
                opacity: 0,
                animation: 'paperReveal 700ms cubic-bezier(0.2, 0.9, 0.2, 1) forwards',
                willChange: 'transform, opacity, filter',
              },
              '.paper-reveal-1': { animationDelay: '40ms' },
              '.paper-reveal-2': { animationDelay: '140ms' },
              '.paper-reveal-3': { animationDelay: '240ms' },
              '.paper-reveal-4': { animationDelay: '340ms' },
              body: {
                textRendering: 'geometricPrecision',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                backgroundImage:
                  mode === 'light'
                    ? 'radial-gradient(900px 650px at 18% 6%, rgba(46, 111, 94, 0.10), transparent 62%), radial-gradient(980px 720px at 92% 8%, rgba(123, 44, 191, 0.10), transparent 58%), linear-gradient(0deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.20)), repeating-linear-gradient(0deg, rgba(23, 23, 23, 0.025), rgba(23, 23, 23, 0.025) 1px, transparent 1px, transparent 22px)'
                    : 'radial-gradient(900px 650px at 18% 6%, rgba(122, 215, 190, 0.13), transparent 62%), radial-gradient(980px 720px at 92% 8%, rgba(201, 161, 255, 0.12), transparent 58%), linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03)), repeating-linear-gradient(0deg, rgba(241, 240, 238, 0.05), rgba(241, 240, 238, 0.05) 1px, transparent 1px, transparent 22px)',
              },
              a: {
                color: 'inherit',
                textDecorationColor:
                  mode === 'light' ? 'rgba(46, 111, 94, 0.45)' : 'rgba(122, 215, 190, 0.50)',
                textUnderlineOffset: '0.18em',
                textDecorationThickness: '1px',
              },
              'a:hover': {
                textDecorationColor:
                  mode === 'light' ? 'rgba(123, 44, 191, 0.55)' : 'rgba(201, 161, 255, 0.62)',
              },
              '::selection': {
                background:
                  mode === 'light' ? 'rgba(46, 111, 94, 0.16)' : 'rgba(122, 215, 190, 0.18)',
              },
              code: {
                fontFamily: '"JetBrains Mono", monospace',
              },
              pre: {
                fontFamily: '"JetBrains Mono", monospace',
              },
              '@media (prefers-reduced-motion: reduce)': {
                '.paper-reveal': {
                  opacity: 1,
                  animation: 'none',
                  transform: 'none',
                  filter: 'none',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                border:
                  mode === 'light'
                    ? '1px solid rgba(23, 23, 23, 0.10)'
                    : '1px solid rgba(241, 240, 238, 0.10)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                borderBottom:
                  mode === 'light'
                    ? '1px solid rgba(23, 23, 23, 0.10)'
                    : '1px solid rgba(241, 240, 238, 0.10)',
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
