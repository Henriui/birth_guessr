import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, TextField, Typography, Stack, Container, Collapse, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, FormControlLabel, Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { Turnstile } from '@marsidev/react-turnstile';
import { useTranslation } from 'react-i18next';
import { ContentCopy } from '@mui/icons-material';
import { EU_DATE_FORMAT } from '../utils/date';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [guessCloseDate, setGuessCloseDate] = useState<Dayjs | null>(null);
  const [minWeightKg, setMinWeightKg] = useState('1.8');
  const [maxWeightKg, setMaxWeightKg] = useState('5.2');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowGuessEdits, setAllowGuessEdits] = useState(false);
  const [joinKey, setJoinKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [createdEvent, setCreatedEvent] = useState<{key: string, secret: string} | null>(null);

  const handleCreate = async () => {
    try {
      // Format: YYYY-MM-DDTHH:MM:SS (NaiveDateTime)
      // We append T12:00:00 for due dates without specific time
      const formattedDate = dueDate ? dueDate.format('YYYY-MM-DD') + 'T12:00:00' : null;
      const formattedCloseDate = guessCloseDate ? guessCloseDate.format('YYYY-MM-DD') + 'T23:59:59' : null;

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          due_date: formattedDate,
          guess_close_date: formattedCloseDate,
          turnstile_token: turnstileToken,
          min_weight_kg: minWeightKg ? parseFloat(minWeightKg) : null,
          max_weight_kg: maxWeightKg ? parseFloat(maxWeightKg) : null,
          allow_guess_edits: allowGuessEdits,
        })
      });
      
      if (res.ok) {
        const event = await res.json();
        // event has event_key and secret_key
        localStorage.setItem(`event_admin_key_${event.id}`, event.secret_key);
        setCreatedEvent({ key: event.event_key, secret: event.secret_key });
      } else {
        const txt = await res.text();
        alert(t('home.alert_create_fail') + ': ' + txt);
      }
    } catch {
      alert(t('home.alert_create_error'));
    }
  };

  const handleDialogClose = () => {
      if (createdEvent) {
          navigate(`/event?key=${createdEvent.key}`);
      }
  };

  const handleJoin = () => {
    if (joinKey) navigate(`/event?key=${joinKey}`);
  };

  return (
    <Container maxWidth="sm" className="paper-reveal paper-reveal-1" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Paper elevation={3} className="paper-reveal paper-reveal-2" sx={{ p: 4, width: '100%', borderRadius: 4 }}>
        <Typography variant="h4" component="h1" className="paper-reveal paper-reveal-3" align="center" gutterBottom fontWeight="bold" color="primary">
          {t('home.title')}
        </Typography>
        <Typography variant="body1" className="paper-reveal paper-reveal-4" align="center" color="text.secondary" mb={4}>
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
            format={EU_DATE_FORMAT}
            minDate={dayjs().add(1, 'day')}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <Box>
            <Button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                sx={{ mb: 1, textTransform: 'none' }}
                size="small"
            >
                {showAdvanced ? '🔽' : '▶️'} {t('home.advanced_options')}
            </Button>
            <Collapse in={showAdvanced}>
                <DatePicker
                    label={t('home.field_guess_close_date')}
                    value={guessCloseDate}
                    onChange={(newValue) => setGuessCloseDate(newValue)}
                    format={EU_DATE_FORMAT}
                    slotProps={{ 
                        textField: { 
                            fullWidth: true, 
                            helperText: t('home.help_guess_close_date') 
                        } 
                    }}
                    minDate={dayjs().add(1, 'day')}
                    maxDate={dueDate || undefined}
                  />

                <Stack direction="row" spacing={2} mt={2}>
                  <TextField
                    label={t('home.field_min_weight')}
                    type="number"
                    inputProps={{ step: 0.1, min: 1, max: 8 }}
                    fullWidth
                    value={minWeightKg}
                    onChange={(e) => setMinWeightKg(e.target.value)}
                    helperText={t('home.help_weight_range')}
                  />
                  <TextField
                    label={t('home.field_max_weight')}
                    type="number"
                    inputProps={{ step: 0.1, min: 1, max: 8 }}
                    fullWidth
                    value={maxWeightKg}
                    onChange={(e) => setMaxWeightKg(e.target.value)}
                    helperText={t('home.help_weight_range')}
                  />
                </Stack>

                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={
                    <Checkbox
                      checked={allowGuessEdits}
                      onChange={(e) => setAllowGuessEdits(e.target.checked)}
                    />
                  }
                  label={t('home.field_allow_guess_edits')}
                />
            </Collapse>
          </Box>

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
            disabled={!title || !turnstileToken || !dueDate}
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

      <Dialog open={!!createdEvent}>
        <DialogTitle>{t('admin.secret_key_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('admin.secret_key_desc')}
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="code" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {createdEvent?.secret}
            </Typography>
            <IconButton onClick={() => navigator.clipboard.writeText(createdEvent?.secret || '')} title={t('admin.copy_key')}>
              <ContentCopy />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} variant="contained" autoFocus>
            {t('cookie_banner.button_ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
