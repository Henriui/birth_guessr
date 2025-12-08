import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, TextField, Typography, Stack, Container } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import { Turnstile } from '@marsidev/react-turnstile';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [joinKey, setJoinKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleCreate = async () => {
    try {
      // Format: YYYY-MM-DDTHH:MM:SS (NaiveDateTime)
      // We append T12:00:00 for due dates without specific time
      const formattedDate = dueDate ? dueDate.format('YYYY-MM-DD') + 'T12:00:00' : null;
      
      console.log('Sending payload:', { title, description, due_date: formattedDate });

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          due_date: formattedDate,
          turnstile_token: turnstileToken
        })
      });
      
      if (res.ok) {
        const event = await res.json();
        navigate(`/event?key=${event.event_key}`);
      } else {
        const txt = await res.text();
        console.error('Failed to create event:', txt);
        alert(t('home.alert_create_fail') + ': ' + txt);
      }
    } catch (err) {
      console.error(err);
      alert(t('home.alert_create_error'));
    }
  };

  const handleJoin = () => {
    if (joinKey) navigate(`/event?key=${joinKey}`);
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom fontWeight="bold" color="primary">
          {t('home.title')}
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" mb={4}>
          {t('home.subtitle')}
        </Typography>

        <Stack spacing={3}>
          <TextField 
            label={t('home.field_title')}
            fullWidth 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('home.placeholder_title')}
          />
          <TextField 
            label={t('home.field_description')}
            fullWidth 
            multiline 
            rows={3} 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
          />
          <DatePicker
            label={t('home.field_due_date')}
            value={dueDate}
            onChange={(newValue) => setDueDate(newValue)}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <Box display="flex" justifyContent="center">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ""}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </Box>
          
          <Button 
            variant="contained" 
            size="large" 
            onClick={handleCreate}
            disabled={!title || !turnstileToken}
            sx={{ py: 1.5 }}
          >
            {t('home.button_create')}
          </Button>
        </Stack>

        <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" align="center" color="text.secondary" mb={2}>
            {t('home.join_text')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField 
              size="small" 
              fullWidth 
              placeholder="XXXXXX-XXXXXX-XXXXXX"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value)}
            />
            <Button variant="outlined" onClick={handleJoin}>
              {t('home.button_join')}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
