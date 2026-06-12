import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SavedPlans from './SavedPlans';
import { listSavedPlans, listSavedWorkoutPlans } from '../services/api';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  listSavedPlans: vi.fn(),
  deleteSavedPlan: vi.fn(),
  listSavedWorkoutPlans: vi.fn(),
  deleteSavedWorkoutPlan: vi.fn(),
  logWorkoutSession: vi.fn(),
}));

beforeEach(() => {
  listSavedPlans.mockResolvedValue([]);
  listSavedWorkoutPlans.mockResolvedValue([]);
});

describe('SavedPlans', () => {
  it('loads and renders the saved plans view', async () => {
    render(
      <MemoryRouter>
        <SavedPlans />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /mes plans sauvegardés/i }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check once loaded', async () => {
    const { container } = render(
      <MemoryRouter>
        <SavedPlans />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: /mes plans sauvegardés/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
