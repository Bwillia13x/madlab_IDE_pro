import { dcf, epv, type DcfInput, type EpvInput } from '../index';
import { DcfInputSchema, EpvInputSchema } from '../schemas';

export function computeDcf(input: unknown) {
  const z = DcfInputSchema.safeParse(input);
  if (!z.success) {
    const issues = z.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message }));
    return { ok: false as const, error: { issues } } as const;
  }
  return { ok: true as const, value: dcf(z.data as DcfInput) } as const;
}

export function computeEpv(input: unknown) {
  const z = EpvInputSchema.safeParse(input);
  if (!z.success) {
    const issues = z.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message }));
    return { ok: false as const, error: { issues } } as const;
  }
  return { ok: true as const, value: epv(z.data as EpvInput) } as const;
}
