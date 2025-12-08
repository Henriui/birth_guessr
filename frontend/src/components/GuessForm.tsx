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
  const [color, setColor] = useState('#6366f1');

  const handleSubmit = async () => {
    if (!event) return;
    if (!guessDate) return;

    const w = parseFloat(weight);

    if (isNaN(w) || w <= 1 || w >= 10) {
      alert(t('guess_form.alert_weight_range'));
      return;
    }

    if (w > 5) {
      if (!window.confirm(t('guess_form.alert_chonker'))) return;
    }

    if (guessDate.isBefore(dayjs(), 'day')) {
      alert(t('guess_form.alert_past_date'));
      return;
    }

    if (event.due_date) {
      const maxDate = dayjs(event.due_date).add(1, 'month');
      if (guessDate.isAfter(maxDate)) {
        alert(t('guess_form.alert_date_limit'));
        return;
      }
    }

    try {
      const formattedDate = guessDate.format('YYYY-MM-DD') + 'T12:00:00';

      await fetch(`/api/events/${event.id}/guesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name,
          guessed_date: formattedDate,
          guessed_weight_kg: w,
          color_hex: color,
        }),
      });

      setName('');
      setWeight('');
      setGuessDate(null);
    } catch (err) {
      console.error(err);
      alert(t('guess_form.alert_submit_fail'));
    }
  };

  const isDisabled = !name || !weight || !guessDate;

  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('guess_form.title')}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={t('guess_form.field_name')}
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <DatePicker
              label={t('guess_form.field_date')}
              value={guessDate}
              onChange={(newValue) => setGuessDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Stack>
          <TextField
            label={t('guess_form.field_weight')}
            type="number"
            inputProps={{ step: 0.01 }}
            size="small"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Box>
            <Typography variant="caption">{t('guess_form.field_color')}</Typography>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '100%', height: 40, cursor: 'pointer', border: 'none' }}
            />
          </Box>
          <Button variant="contained" onClick={handleSubmit} disabled={isDisabled}>
            {t('guess_form.button_submit')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
