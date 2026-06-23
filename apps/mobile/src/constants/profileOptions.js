export const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perdre du poids' },
  { value: 'muscle_gain', label: 'Prendre du muscle' },
  { value: 'endurance', label: 'Améliorer mon endurance' },
  { value: 'general_health', label: 'Maintenir ma forme' },
];

export const WORKOUT_GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perte de graisse / sèche' },
  { value: 'muscle_mass', label: 'Prise de masse' },
  { value: 'strength', label: 'Renforcement musculaire' },
  { value: 'endurance', label: 'Endurance / cardio' },
  { value: 'general_health', label: 'Santé générale' },
  { value: 'maintenance', label: 'Maintien de la forme' },
];

export const MEAL_PLAN_GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Perdre du poids' },
  { value: 'muscle_gain', label: 'Prendre du muscle' },
  { value: 'endurance', label: 'Améliorer mon endurance' },
  { value: 'maintenance', label: 'Maintenir ma forme' },
];

export const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

export const DIET_OPTIONS = [
  { value: 'none', label: 'Aucune restriction' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végan' },
  { value: 'gluten_free', label: 'Sans gluten' },
  { value: 'lactose_free', label: 'Sans lactose' },
];

export const GENDER_OPTIONS = [
  { value: '', label: '— Choisir —' },
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
  { value: 'O', label: 'Autre / Ne pas préciser' },
];

export const LOCATION_OPTIONS = [
  { value: 'home', label: 'À la maison' },
  { value: 'gym', label: 'En salle de sport' },
  { value: 'outdoor', label: 'En extérieur' },
];

export const FOCUS_OPTIONS = [
  { value: 'upper', label: '💪 Haut du corps' },
  { value: 'lower', label: '🦵 Bas du corps' },
  { value: 'full', label: '🏋️ Full body' },
  { value: 'cardio', label: '🏃 Cardio' },
  { value: 'hiit', label: '🔥 HIIT' },
  { value: 'mobility', label: '🧘 Mobilité' },
  { value: 'other', label: '🏋️ Autre' },
];

export const GOAL_LABELS = {
  weight_loss: 'Perdre du poids',
  muscle_gain: 'Prendre du muscle',
  muscle_mass: 'Prise de masse',
  strength: 'Renforcement musculaire',
  endurance: 'Améliorer mon endurance',
  general_health: 'Maintenir ma forme',
  maintenance: 'Maintien de la forme',
};

export const LEVEL_LABELS = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export const DIET_LABELS = {
  none: 'Aucune',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
  gluten_free: 'Sans gluten',
  lactose_free: 'Sans lactose',
};

export const GENDER_LABELS = {
  M: 'Homme',
  F: 'Femme',
  O: 'Autre',
};

export const MEAL_TYPE_LABELS = {
  breakfast: '🥐 Petit-déjeuner',
  lunch: '🍽️ Déjeuner',
  dinner: '🌙 Dîner',
  snack: '🍎 Collation',
};

export const MEAL_ICONS = {
  'Petit-déjeuner': '🥐',
  'Déjeuner': '🍽️',
  'Dîner': '🌙',
  'Collation': '🍎',
};

export const FOCUS_LABELS = Object.fromEntries(
  FOCUS_OPTIONS.map((o) => [o.value, o.label]),
);
