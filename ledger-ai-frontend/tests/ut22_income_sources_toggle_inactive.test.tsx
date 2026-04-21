import { render, screen } from '@testing-library/react';
import { AnimatedText } from '../components/UI';

describe('AnimatedText', () => {
  it('splits animated text into individual characters', () => {
    render(<AnimatedText text="Hi there" />);

    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('i')).toBeInTheDocument();
    expect(screen.getByText('t')).toBeInTheDocument();
  });
});
