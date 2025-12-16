import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import type { EventData } from './types';
import { useTranslation } from 'react-i18next';

interface GuessFormProps {
  event: EventData;
}

export function GuessForm({ event }: GuessFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [guessDate, setGuessDate] = useState<Dayjs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(() => {
    const bytes = new Uint8Array(3);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      bytes[0] = Math.floor(Math.random() * 256);
      bytes[1] = Math.floor(Math.random() * 256);
      bytes[2] = Math.floor(Math.random() * 256);
    }
    return `#${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`;
  });
  const [submitted, setSubmitted] = useState(false);

  const alreadyGuessed =
    submitted || (event?.id ? Boolean(localStorage.getItem(`guess_token_${event.id}`)) : false);

  const minWeightKg = typeof event.min_weight_kg === 'number' ? event.min_weight_kg : 1.8;
  const maxWeightKg = typeof event.max_weight_kg === 'number' ? event.max_weight_kg : 5.2;

  const handleSubmit = async () => {
    if (!event) return;
    if (!guessDate) return;

    const w = parseFloat(weight);

    if (isNaN(w) || w < minWeightKg || w > maxWeightKg) {
      setError(t('guess_form.alert_weight_range'));
      return;
    }

    if (guessDate.isBefore(dayjs(), 'day')) {
      setError(t('guess_form.alert_past_date'));
      return;
    }

    if (event.due_date) {
      const maxDate = dayjs(event.due_date).add(1, 'month');
      if (guessDate.isAfter(maxDate)) {
        setError(t('guess_form.alert_date_limit'));
        return;
      }
    }

    try {
      const formattedDate = guessDate.format('YYYY-MM-DD') + 'T12:00:00';

      const res = await fetch(`/api/events/${event.id}/guesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name,
          guessed_date: formattedDate,
          guessed_weight_kg: w,
          color_hex: color,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // data is [invitee, guess]
        const invitee = data[0];
        if (invitee && invitee.id) {
            localStorage.setItem(`guess_token_${event.id}`, invitee.id);
            setSubmitted(true);
        }

        setError(null);
        
        setName('');
        setWeight('');
        setGuessDate(null);
      } else {
        setError(t('guess_form.alert_submit_fail'));
      }
    } catch (err) {
      console.error(err);
      setError(t('guess_form.alert_submit_fail'));
    }
  };

  const isDisabled = !name || !weight || !guessDate;

  if (alreadyGuessed) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            {t('guess_form.already_guessed')}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 4,
        border: error ? '1px solid' : undefined,
        borderColor: error ? 'error.main' : undefined,
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('guess_form.title')}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={t('guess_form.field_name')}
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            error={Boolean(error)}
          />
          <Stack direction="row" spacing={2}>
            <DatePicker
              label={t('guess_form.field_date')}
              value={guessDate}
              onChange={(newValue) => {
                setGuessDate(newValue);
                if (error) setError(null);
              }}
              slotProps={{
                textField: { size: 'small', error: Boolean(error) },
              }}
            />
          </Stack>
          <TextField
            label={t('guess_form.field_weight')}
            type="number"
            inputProps={{ step: 0.01, min: minWeightKg, max: maxWeightKg }}
            size="small"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
              if (error) setError(null);
            }}
            error={Boolean(error)}
          />
          <Box>
            <Typography variant="caption">{t('guess_form.field_color')}</Typography>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (error) setError(null);
              }}
              style={{ width: '100%', height: 40, cursor: 'pointer', border: 'none' }}
            />
          </Box>
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          <Button variant="contained" onClick={handleSubmit} disabled={isDisabled}>
            {t('guess_form.button_submit')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
