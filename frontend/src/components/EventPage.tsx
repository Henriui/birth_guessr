import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, Paper, Typography, TextField, Button, Grid, Stack, Chip, Container,
  Card, CardContent, List, ListItem, ListItemText, ListItemAvatar, Avatar
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { TooltipProps } from 'recharts';

interface EventData {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  event_key: string;
}

interface Guess {
  display_name: string;
  color_hex: string;
  guessed_date: string;
  guessed_weight_kg: number;
}

export default function EventPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventKey = searchParams.get('key');
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [guessDate, setGuessDate] = useState<Dayjs | null>(null);
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    if (!eventKey) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Get Event
        const evtRes = await fetch(`/api/events/by-key/${eventKey}`);
        if (!evtRes.ok) throw new Error('Event not found');
        const evtData = await evtRes.json();
        setEvent(evtData);

        // 2. Get Guesses
        const guessRes = await fetch(`/api/events/${evtData.id}/guesses`);
        if (guessRes.ok) {
          const guessData = await guessRes.json();
          setGuesses(guessData);
        }

        // 3. SSE
        const sse = new EventSource(`/api/events/${evtData.id}/live`);
        sse.onmessage = (msg) => {
          const newGuess = JSON.parse(msg.data);
          setGuesses(prev => [...prev, newGuess]);
        };

        return () => sse.close();
      } catch (err) {
        console.error(err);
        alert('Could not load event');
      }
    };

    fetchData();
  }, [eventKey, navigate]);

  const handleSubmit = async () => {
    if (!event) return;
    
    // Validation
    if (!guessDate) return;
    const w = parseFloat(weight);

    // Weight check
    if (isNaN(w) || w <= 1 || w >= 10) {
      alert("Weight must be between 1kg and 10kg! ⚖️");
      return;
    }
    
    // Chonker check
    if (w > 5) {
      if (!window.confirm("That's a chonker! Are you sure? 🐘")) return;
    }

    // Past date check (allow today)
    if (guessDate.isBefore(dayjs(), 'day')) {
      alert("Can't wager a date in the past! 🕰️");
      return;
    }

    // Max 1 month from due date
    if (event.due_date) {
      const maxDate = dayjs(event.due_date).add(1, 'month');
      if (guessDate.isAfter(maxDate)) {
        alert("Date can't be more than 1 month after due date! 📅");
        return;
      }
    }

    try {
      // Append dummy time for backend compatibility
      const formattedDate = guessDate.format('YYYY-MM-DD') + 'T12:00:00';

      await fetch(`/api/events/${event.id}/guesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name,
          guessed_date: formattedDate,
          guessed_weight_kg: w,
          color_hex: color
        })
      });
      // Clear form
      setName('');
      setWeight('');
      setGuessDate(null);
    } catch (err) {
      alert('Failed to submit guess');
    }
  };

  // Chart Data Preparation
  const chartData = guesses.map(g => ({
    x: new Date(g.guessed_date).getTime(),
    y: g.guessed_weight_kg,
    z: g.guessed_weight_kg, // for bubble size
    name: g.display_name,
    color: g.color_hex
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, number>) => {
    if (active && payload && payload.length) {
      const pt = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">{pt.name}</Typography>
          <Typography variant="body2">
            {new Date(pt.x).toLocaleDateString()}
          </Typography>
          <Typography variant="body2">
            {pt.y} kg
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (!event) return <Typography p={4}>Loading...</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 8 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 0 }}>
        <Container maxWidth="lg">
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h4" fontWeight="bold" gutterBottom>{event.title}</Typography>
              <Typography color="text.secondary">{event.description}</Typography>
            </Grid>
            <Grid item>
              <Typography variant="overline" color="text.secondary" display="block">Invite Key</Typography>
              <Chip label={event.event_key} variant="outlined" onClick={() => navigator.clipboard.writeText(event.event_key)} />
            </Grid>
          </Grid>
        </Container>
      </Paper>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Chart Section */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 4, height: 500 }}>
              <Typography variant="h6" gutterBottom>Guesses Graph 📊</Typography>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Date" 
                    domain={['auto', 'auto']}
                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                  />
                  <YAxis type="number" dataKey="y" name="Weight" unit="kg" domain={[0, 12]} />
                  <ZAxis type="number" dataKey="z" range={[50, 400]} name="Weight Size" />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter name="Guesses" data={chartData} fill="#8884d8">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>


          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              {/* Form */}
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Make a Guess 🎲</Typography>
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
                    <Button variant="contained" onClick={handleSubmit} disabled={!name || !weight || !guessDate}>
                      Submit Guess
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* List */}
              <Card sx={{ borderRadius: 4, flexGrow: 1 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Guesses</Typography>
                  <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {[...guesses].reverse().map((g, i) => (
                      <ListItem key={i}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: g.color_hex, width: 24, height: 24 }}> </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={g.display_name}
                          secondary={`${g.guessed_weight_kg}kg on ${new Date(g.guessed_date).toLocaleDateString()}`} 
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
