import { AppBar, Toolbar, Typography, IconButton, Box, Menu, MenuItem } from '@mui/material';
import { Brightness4, Brightness7, Translate } from '@mui/icons-material';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { mode, toggleColorMode, changeLanguage, language } = useThemeLanguage();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = (lang?: string) => {
    setAnchorEl(null);
    if (lang) {
      changeLanguage(lang);
    }
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 'bold' }}
          onClick={() => navigate('/')}
        >
          Baby Birth Guessr 👶
        </Typography>
        
        <Box>
          <IconButton onClick={handleLanguageClick} color="inherit">
            <Translate />
            <Typography variant="button" sx={{ ml: 1 }}>
              {language.toUpperCase()}
            </Typography>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => handleLanguageClose()}
          >
            <MenuItem onClick={() => handleLanguageClose('en')}>English</MenuItem>
            <MenuItem onClick={() => handleLanguageClose('fi')}>Suomi</MenuItem>
          </Menu>

          <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
