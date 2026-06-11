import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MealAnalysis from './MealAnalysis';

vi.mock('../services/api', () => ({
  analyzeMealPhoto: vi.fn(),
  lookupMacros: vi.fn(),
  saveMeal: vi.fn(),
}));

describe('MealAnalysis upload UI', () => {
  it('shows upload step and file input', () => {
    render(<MealAnalysis />);

    expect(screen.getByRole('heading', { name: /analyser un repas/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/prends ou choisis une photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cliquer pour choisir une photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/étapes de l'analyse/i)).toBeInTheDocument();
    expect(document.getElementById('meal-photo')).toHaveAttribute('accept', 'image/*');
  });

  it('shows preview and analyze button after selecting an image', async () => {
    const user = userEvent.setup();
    render(<MealAnalysis />);

    const fileInput = document.getElementById('meal-photo');
    const file = new File(['fake-image'], 'meal.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    expect(screen.getByAltText(/aperçu du repas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyser ce repas/i })).toBeInTheDocument();
  });
});
