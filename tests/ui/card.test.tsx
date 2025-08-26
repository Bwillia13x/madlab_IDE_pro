/**
 * Tests for Card Component
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

describe('Card Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('should render basic card', () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    );

    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should render card with header', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should render card with footer', () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
        <CardFooter>
          <p>Card footer</p>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Card content')).toBeInTheDocument();
    expect(screen.getByText('Card footer')).toBeInTheDocument();
  });

  it('should render complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>Full card with all sections</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content area</p>
        </CardContent>
        <CardFooter>
          <p>Footer actions</p>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('Full card with all sections')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('should support custom className', () => {
    render(
      <Card className="custom-card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByText('Content').closest('.custom-card');
    expect(card).toBeInTheDocument();
  });

  it('should render nested components correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="nested-content">Nested content</div>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
