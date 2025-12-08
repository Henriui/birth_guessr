import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, TextField, Typography, Stack, Container } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';

export default function Home() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [joinKey, setJoinKey] = useState('');

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
          due_date: formattedDate
        })
      });
      
      if (res.ok) {
        const event = await res.json();
        navigate(`/event?key=${event.event_key}`);
      } else {
        const txt = await res.text();
        console.error('Failed to create event:', txt);
        alert('Failed to create event: ' + txt);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating event');
    }
  };

  const handleJoin = () => {
    if (joinKey) navigate(`/event?key=${joinKey}`);
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom fontWeight="bold" color="primary">
          Baby Birth Guessr 👶
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" mb={4}>
          Create an event and invite friends to guess!
        </Typography>

        <Stack spacing={3}>
          <TextField 
            label="Event Title" 
            fullWidth 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Baby Smith"
          />
          <TextField 
            label="Description (Optional)" 
            fullWidth 
            multiline 
            rows={3} 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
          />
          <DatePicker
            label="Expected Due Date"
            value={dueDate}
            onChange={(newValue) => setDueDate(newValue)}
            slotProps={{ textField: { fullWidth: true } }}
          />
          
          <Button 
            variant="contained" 
            size="large" 
            onClick={handleCreate}
            disabled={!title}
            sx={{ py: 1.5 }}
          >
            Create Event
          </Button>
        </Stack>

        <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" align="center" color="text.secondary" mb={2}>
            Have an invite key?
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
              Join
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
