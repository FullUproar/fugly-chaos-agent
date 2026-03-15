import type { GameType } from '../types/database';

export interface SetupQuestion {
  id: string;
  label: string;
  type: 'select' | 'toggle' | 'text';
  options?: { value: string; label: string }[];
}

export const STANDARD_QUESTIONS: SetupQuestion[] = [
  {
    id: 'chaos_comfort',
    label: "What's your chaos comfort level?",
    type: 'select',
    options: [
      { value: 'chill', label: 'Chill — keep it easy' },
      { value: 'moderate', label: 'Moderate — I can take a hit' },
      { value: 'maximum', label: 'Maximum — bring the chaos' },
    ],
  },
  {
    id: 'social_style',
    label: "What's your style tonight?",
    type: 'select',
    options: [
      { value: 'observer', label: 'Observer — I watch and strike' },
      { value: 'participant', label: 'Participant — I go with the flow' },
      { value: 'instigator', label: 'Instigator — I start things' },
    ],
  },
  {
    id: 'physical_ok',
    label: 'Physical challenges OK?',
    type: 'toggle',
  },
  {
    id: 'competitive_ok',
    label: 'Competitive sabotage OK?',
    type: 'toggle',
  },
];

export const WILDCARD_QUESTIONS: Record<GameType, SetupQuestion> = {
  board_game: {
    id: 'wildcard',
    label: "What's your biggest gaming pet peeve?",
    type: 'text',
  },
  party_game: {
    id: 'wildcard',
    label: "What's the most embarrassing thing you'd do for 50 points?",
    type: 'text',
  },
  dinner_party: {
    id: 'wildcard',
    label: 'Describe your ideal meal in 3 words',
    type: 'text',
  },
  house_party: {
    id: 'wildcard',
    label: "What's your signature party move?",
    type: 'text',
  },
  bar_night: {
    id: 'wildcard',
    label: "What's your go-to drink order?",
    type: 'text',
  },
  custom: {
    id: 'wildcard',
    label: 'What should everyone know about you tonight?',
    type: 'text',
  },
};
