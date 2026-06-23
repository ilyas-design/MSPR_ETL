import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// `test.globals` n'est pas activé : on enregistre explicitement le cleanup RTL
// après chaque test pour éviter que le DOM d'un test fuite dans le suivant.
afterEach(() => {
  cleanup();
});

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}