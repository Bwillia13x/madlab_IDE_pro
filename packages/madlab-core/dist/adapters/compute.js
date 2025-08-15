import { dcf, epv } from '../index';
import { DcfInputSchema, EpvInputSchema } from '../schemas';
export function computeDcf(input) {
    const z = DcfInputSchema.safeParse(input);
    if (!z.success) {
        const issues = z.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message }));
        return { ok: false, error: { issues } };
    }
    return { ok: true, value: dcf(z.data) };
}
export function computeEpv(input) {
    const z = EpvInputSchema.safeParse(input);
    if (!z.success) {
        const issues = z.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message }));
        return { ok: false, error: { issues } };
    }
    return { ok: true, value: epv(z.data) };
}
