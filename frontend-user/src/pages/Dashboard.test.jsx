import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import {
  getMyProfile,
  getRecommendationsToday,
  getWorkoutsToday,
  getWorkoutsSummary,
} from '../services/api';

expect.extend(toHaveNoViolations);

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
}));

vi.mock('../services/api', () => ({
  getMyProfile: vi.fn(),
  getRecommendationsToday: vi.fn(),
  getWorkoutsToday: vi.fn(),
  getWorkoutsSummary: vi.fn(),
}));

beforeEach(() => {
  // onboarded:true évite la redirection vers /onboarding
  getMyProfile.mockResolvedValue({
    onboarded: true,
    goal: 'weight_loss',
    experience_level: 'beginner',
    age: 30,
    gender: 'F',
    weight_kg: 65,
  });
  getRecommendationsToday.mockResolvedValue(null);
  getWorkoutsToday.mockResolvedValue(null);
  getWorkoutsSummary.mockResolvedValue([]);
});

describe('Dashboard', () => {
  it('loads and renders the dashboard for an onboarded user', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /ton tableau de bord/i }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check once loaded', async () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: /ton tableau de bord/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
