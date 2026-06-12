import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import Onboarding from './Onboarding';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  updateMyProfile: vi.fn(),
}));

describe('Onboarding', () => {
  it('renders the onboarding form', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /valider et accéder/i }),
    ).toBeInTheDocument();
  });

  it('passes axe accessibility smoke check', async () => {
    const { container } = render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
