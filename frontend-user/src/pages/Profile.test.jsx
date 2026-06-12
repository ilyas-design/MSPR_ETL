import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Profile from './Profile';
import { getMyProfile } from '../services/api';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}));

beforeEach(() => {
  getMyProfile.mockResolvedValue({
    goal: 'weight_loss',
    experience_level: 'beginner',
    dietary_restrictions: 'none',
    allergies: '',
    equipment_available: '',
    injuries: [],
    age: 30,
    gender: 'F',
    height_cm: 170,
    weight_kg: 65,
  });
});

describe('Profile', () => {
  it('loads and renders the profile form', async () => {
    render(<Profile />);
    expect(await screen.findByRole('heading', { name: /mon profil/i })).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check once loaded', async () => {
    const { container } = render(<Profile />);
    await screen.findByRole('heading', { name: /mon profil/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
