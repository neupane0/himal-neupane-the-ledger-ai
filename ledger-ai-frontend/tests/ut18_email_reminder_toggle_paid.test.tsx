import { render, screen } from '@testing-library/react';
import { Card, Input } from '../components/UI';

describe('Card and Input', () => {
  it('renders labeled inputs and cards', () => {
    render(
      <Card title="Profile">
        <Input label="Display name" placeholder="Alice" />
      </Card>,
    );

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText(/display name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Alice')).toBeInTheDocument();
  });
});
