import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Coach from './Coach';
import { getRecommendationsToday } from '../services/api';

expect.extend(toHaveNoViolations);

// Chart.js s'appuie sur <canvas>, non implémenté par jsdom → on stube le graphe.
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
}));

vi.mock('../services/api', () => ({
  getRecommendationsToday: vi.fn(),
  getCoachAdvice: vi.fn(),
}));

beforeEach(() => {
  getRecommendationsToday.mockResolvedValue({
    profile: { goal_label: 'Perdre du poids' },
    imbalances: [
      { nutrient: 'protein', eaten: 50, target: 80, status: 'deficit' },
    ],
    totals_today: { meals_count: 2 },
    suggestions: [],
  });
});

describe('Coach', () => {
  it('loads and renders the coach view', async () => {
    render(
      <MemoryRouter>
        <Coach />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /mon coach nutritionnel/i }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check once loaded', async () => {
    const { container } = render(
      <MemoryRouter>
        <Coach />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: /mon coach nutritionnel/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
