import type { GameType } from '../types/database';

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  board_game: 'Board Game',
  party_game: 'Party Game',
  dinner_party: 'Dinner Party',
  house_party: 'House Party',
  bar_night: 'Bar Night',
  custom: 'Custom / Other',
};

export const GAME_TYPE_OPTIONS: { value: GameType; label: string; description: string }[] = [
  { value: 'board_game', label: 'Board Game', description: 'Catan, Monopoly, etc.' },
  { value: 'party_game', label: 'Party Game', description: 'Cards Against Humanity, etc.' },
  { value: 'dinner_party', label: 'Dinner Party', description: 'Hosting dinner with friends' },
  { value: 'house_party', label: 'House Party', description: 'Casual hangout or party' },
  { value: 'bar_night', label: 'Bar Night', description: 'Out at a bar or restaurant' },
  { value: 'custom', label: 'Custom', description: 'Describe your own event' },
];
