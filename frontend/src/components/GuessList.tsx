import { Avatar, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import type { Guess } from './types';

interface GuessListProps {
  guesses: Guess[];
}

export function GuessList({ guesses }: GuessListProps) {
  return (
    <Card sx={{ borderRadius: 4, flexGrow: 1 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Guesses
        </Typography>
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
  );
}
