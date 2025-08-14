import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AutoForm from '@/lib/ui/AutoForm';
import { z } from 'zod';

describe('AutoForm', () => {
  it('renders controls for string/number/boolean/enum', () => {
    const schema = z.object({
      name: z.string().default('ACME'),
      qty: z.number().min(0).max(10).default(1),
      enabled: z.boolean().default(true),
      mode: z.enum(['a', 'b', 'c']).default('a'),
    });
    const { container } = render(
      <AutoForm schema={schema} value={{}} onChange={() => {}} />
    );
    expect(container).toMatchSnapshot();
  });

  // Interactive behavior is covered in inspector.integration.test.tsx
});


