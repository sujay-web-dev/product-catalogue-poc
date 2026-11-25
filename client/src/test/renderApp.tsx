import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../App';

function LocationProbe() {
  const location = useLocation();
  // A plain div: <output> has role="status" and would clash with loading messages.
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/** Renders the real routes at `path`; screen.getByTestId('location') shows the current URL. */
export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}
