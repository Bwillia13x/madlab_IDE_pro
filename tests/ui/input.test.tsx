/**
 * Tests for Input Component
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('should render with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    // HTML inputs have default type="text" when not specified
  });

  it('should render with different types', () => {
    const { rerender } = render(<Input type="text" placeholder="text input" />);
    expect(screen.getByPlaceholderText('text input')).toHaveAttribute('type', 'text');

    rerender(<Input type="email" placeholder="email input" />);
    expect(screen.getByPlaceholderText('email input')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="password input" />);
    expect(screen.getByPlaceholderText('password input')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" placeholder="number input" />);
    expect(screen.getByPlaceholderText('number input')).toHaveAttribute('type', 'number');
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="change test" />);

    const input = screen.getByPlaceholderText('change test');
    await user.type(input, 'Hello');

    expect(handleChange).toHaveBeenCalledTimes(5); // H, e, l, l, o
  });

  it('should support controlled values', () => {
    const { rerender } = render(<Input value="initial" placeholder="controlled" />);
    const input = screen.getByPlaceholderText('controlled');
    expect(input).toHaveValue('initial');

    rerender(<Input value="updated" />);
    expect(input).toHaveValue('updated');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="disabled test" />);
    const input = screen.getByPlaceholderText('disabled test');
    expect(input).toBeDisabled();
  });

  it('should support custom className', () => {
    render(<Input className="custom-input" placeholder="custom test" />);
    const input = screen.getByPlaceholderText('custom test');
    expect(input).toHaveClass('custom-input');
  });

  it('should support placeholder text', () => {
    render(<Input placeholder="Type here..." />);
    const input = screen.getByPlaceholderText('Type here...');
    expect(input).toBeInTheDocument();
  });

  it('should forward other props to input element', () => {
    render(<Input maxLength={10} data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('maxLength', '10');
  });
});
