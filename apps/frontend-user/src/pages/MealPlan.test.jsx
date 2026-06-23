import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import MealPlan from './MealPlan';
import { getMyProfile, getRecommendationsToday } from '../services/api';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  generateMealPlanAI: vi.fn(),
  getMyProfile: vi.fn(),
  getRecommendationsToday: vi.fn(),
  saveMealPlan: vi.fn(),
}));

beforeEach(() => {
  getMyProfile.mockResolvedValue({ goal: 'weight_loss', allergies: '' });
  getRecommendationsToday.mockResolvedValue(null);
});

describe('MealPlan', () => {
  it('renders the generation form', async () => {
    render(<MealPlan />);
    expect(
      await screen.findByRole('button', { name: /générer mon plan/i }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check', async () => {
    const { container } = render(<MealPlan />);
    await screen.findByRole('button', { name: /générer mon plan/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
