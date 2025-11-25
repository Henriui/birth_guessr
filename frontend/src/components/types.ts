export interface EventData {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  event_key: string;
}

export interface Guess {
  display_name: string;
  color_hex: string;
  guessed_date: string;
  guessed_weight_kg: number;
}

export interface GuessSubmission {
  display_name: string;
  color_hex: string;
  guessed_date: string;
  guessed_weight_kg: number;
}

export interface ChartPoint {
  x: number;
  y: number;
  z: number;
  name: string;
  color: string;
}
