import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';

expect.extend(toHaveNoViolations);

// L'utilisateur est considéré connecté → le header affiche la nav avec dropdowns.
vi.mock('./services/api', () => ({
  isAuthenticated: () => true,
  logout: vi.fn(),
}));

import App from './App';

describe('App — header et navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expose un lien d\'évitement vers le contenu principal', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /aller au contenu principal/i }),
    ).toHaveAttribute('href', '#main-content');
  });

  it('ne contient aucune violation axe sur l\'accueil connecté', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ferme le dropdown nav avec la touche Échap et rend le focus au déclencheur', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /repas/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
