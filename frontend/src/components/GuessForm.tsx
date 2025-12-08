import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import type { EventData } from './types';

interface GuessFormProps {
  event: EventData;
}

export function GuessForm({ event }: GuessFormProps) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [guessDate, setGuessDate] = useState<Dayjs | null>(null);
  const [color, setColor] = useState('#6366f1');

  const handleSubmit = async () => {
    if (!event) return;
    if (!guessDate) return;

    const w = parseFloat(weight);

    if (isNaN(w) || w <= 1 || w >= 10) {
      alert('Weight must be between 1kg and 10kg! ⚖️');
      return;
    }

    if (w > 5) {
      if (!window.confirm("That's a chonker! Are you sure? 🐘")) return;
    }

    if (guessDate.isBefore(dayjs(), 'day')) {
      alert("Can't wager a date in the past! 🕰️");
      return;
    }

    if (event.due_date) {
      const maxDate = dayjs(event.due_date).add(1, 'month');
      if (guessDate.isAfter(maxDate)) {
        alert("Date can't be more than 1 month after due date! 📅");
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
      alert('Failed to submit guess');
    }
  };

  const isDisabled = !name || !weight || !guessDate;

  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Make a Guess 🎲
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Your Name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <DatePicker
              label="Date"
              value={guessDate}
              onChange={(newValue) => setGuessDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Stack>
          <TextField
            label="Weight (kg)"
            type="number"
            inputProps={{ step: 0.01 }}
            size="small"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Box>
            <Typography variant="caption">Color</Typography>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '100%', height: 40, cursor: 'pointer', border: 'none' }}
            />
          </Box>
          <Button variant="contained" onClick={handleSubmit} disabled={isDisabled}>
            Submit Guess
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
