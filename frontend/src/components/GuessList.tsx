import { Avatar, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import type { Guess } from './types';
import { useTranslation } from 'react-i18next';

interface GuessListProps {
  guesses: Guess[];
}

export function GuessList({ guesses }: GuessListProps) {
  const { t, i18n } = useTranslation();

  return (
    <Card sx={{ borderRadius: 4, flexGrow: 1 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('guess_list.title')}
        </Typography>
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {[...guesses].reverse().map((g, i) => (
            <ListItem key={i}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: g.color_hex, width: 24, height: 24 }}> </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={g.display_name}
                secondary={t('guess_list.guess_summary', {
                  weight: g.guessed_weight_kg,
                  date: new Date(g.guessed_date).toLocaleDateString(i18n.language)
                })}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
