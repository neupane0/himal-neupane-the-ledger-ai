import { render, screen } from '@testing-library/react';
import { Button } from '../components/UI';

describe('Button', () => {
  it('renders a loading button state', () => {
    render(<Button isLoading>Save</Button>);

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});
