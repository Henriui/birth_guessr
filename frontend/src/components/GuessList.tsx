import { Avatar, Card, CardContent, IconButton, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import type { Guess } from './types';
import { useTranslation } from 'react-i18next';
import { Delete, Edit } from '@mui/icons-material';

interface GuessListProps {
  guesses: Guess[];
  myInviteeId?: string | null;
  allowGuessEdits?: boolean;
  onEditGuess?: (guess: Guess) => void;
  isAdmin?: boolean;
  onDeleteGuess?: (guess: Guess) => void;
}

export function GuessList({ guesses, myInviteeId, allowGuessEdits, onEditGuess, isAdmin, onDeleteGuess }: GuessListProps) {
  const { t, i18n } = useTranslation();

  return (
    <Card sx={{ borderRadius: 4, flexGrow: 1 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('guess_list.title')}
        </Typography>
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {[...guesses].reverse().map((g, i) => (
            <ListItem
              key={i}
              secondaryAction={
                <>
                  {allowGuessEdits && myInviteeId && onEditGuess && g.invitee_id === myInviteeId ? (
                    <IconButton edge="end" aria-label={t('guess_list.edit')} onClick={() => onEditGuess(g)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  ) : null}
                  {isAdmin && onDeleteGuess ? (
                    <IconButton edge="end" aria-label={t('guess_list.delete')} onClick={() => onDeleteGuess(g)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  ) : null}
                </>
              }
            >
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
