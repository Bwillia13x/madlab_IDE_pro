export declare function computeDcf(input: unknown): {
    readonly ok: false;
    readonly error: {
        readonly issues: {
            path: string;
            msg: string;
        }[];
    };
    readonly value?: undefined;
} | {
    readonly ok: true;
    readonly value: import("../index").DcfResult;
    readonly error?: undefined;
};
export declare function computeEpv(input: unknown): {
    readonly ok: false;
    readonly error: {
        readonly issues: {
            path: string;
            msg: string;
        }[];
    };
    readonly value?: undefined;
} | {
    readonly ok: true;
    readonly value: import("../index").EpvResult;
    readonly error?: undefined;
};
