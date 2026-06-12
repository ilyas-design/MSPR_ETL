import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import SignUp from './SignUp';

expect.extend(toHaveNoViolations);

vi.mock('../services/api', () => ({
  register: vi.fn(),
}));

describe('SignUp', () => {
  it('passes axe accessibility smoke check', async () => {
    const { container } = render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
