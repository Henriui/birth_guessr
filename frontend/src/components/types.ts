export interface EventData {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  event_key: string;
  min_weight_kg?: number;
  max_weight_kg?: number;
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
  subPoints?: { name: string; color: string; weightKg: number }[];
}
