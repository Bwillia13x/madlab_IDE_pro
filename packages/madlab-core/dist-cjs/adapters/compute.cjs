"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDcf = computeDcf;
exports.computeEpv = computeEpv;
const index_1 = require("../index");
const schemas_1 = require("../schemas");
function computeDcf(input) {
    const z = schemas_1.DcfInputSchema.safeParse(input);
    if (!z.success) {
        const issues = z.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message }));
        return { ok: false, error: { issues } };
    }
    return { ok: true, value: (0, index_1.dcf)(z.data) };
}
function computeEpv(input) {
    const z = schemas_1.EpvInputSchema.safeParse(input);
    if (!z.success) {
        const issues = z.error.issues.map((i) => ({ path: i.path.join('.'), msg: i.message }));
        return { ok: false, error: { issues } };
    }
    return { ok: true, value: (0, index_1.epv)(z.data) };
}
