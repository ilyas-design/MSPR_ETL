import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WorkoutPlan from './WorkoutPlan';
import { getMyProfile } from '../services/api';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  generateWorkoutPlanAI: vi.fn(),
  saveWorkoutPlan: vi.fn(),
  getMyProfile: vi.fn(),
}));

beforeEach(() => {
  getMyProfile.mockResolvedValue({
    goal: 'general_health',
    experience_level: 'beginner',
    equipment_available: '',
    injuries: [],
  });
});

describe('WorkoutPlan', () => {
  it('renders the generation form', async () => {
    render(
      <MemoryRouter>
        <WorkoutPlan />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /plan d.entraînement personnalisé/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /générer mon plan d.entraînement/i }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check', async () => {
    const { container } = render(
      <MemoryRouter>
        <WorkoutPlan />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: /plan d.entraînement personnalisé/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
