import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WorkoutHistory from './WorkoutHistory';
import { getMyWorkouts, getWorkoutsToday } from '../services/api';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  getMyWorkouts: vi.fn(),
  getWorkoutsToday: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  logWorkoutSession: vi.fn(),
}));

beforeEach(() => {
  getMyWorkouts.mockResolvedValue([]);
  getWorkoutsToday.mockResolvedValue(null);
});

describe('WorkoutHistory', () => {
  it('loads and renders the sessions view', async () => {
    render(
      <MemoryRouter>
        <WorkoutHistory />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Mes séances', level: 2 }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check once loaded', async () => {
    const { container } = render(
      <MemoryRouter>
        <WorkoutHistory />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Mes séances', level: 2 });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
