/**
 * Tests for Dialog Component
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

describe('Dialog Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
  });

  it('should not show dialog content by default', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Dialog description')).not.toBeInTheDocument();
  });

  it('should show dialog when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: 'Open Dialog' });
    await user.click(trigger);

    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog description')).toBeInTheDocument();
  });

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    // Open dialog
    const trigger = screen.getByRole('button', { name: 'Open Dialog' });
    await user.click(trigger);

    expect(screen.getByText('Dialog Title')).toBeInTheDocument();

    // Close dialog
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
  });

  it('should support dialog with footer', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('should support custom content', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <div data-testid="custom-content">Custom dialog content</div>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  it('should support controlled open state', () => {
    const { rerender } = render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();

    rerender(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();
  });

  it('should call onOpenChange when dialog state changes', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <Dialog onOpenChange={handleOpenChange}>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole('button', { name: 'Open Dialog' });
    await user.click(trigger);

    expect(handleOpenChange).toHaveBeenCalledWith(true);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
