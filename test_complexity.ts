function test_complexity({ cond1, cond2, cond3 }: { cond1: boolean; cond2: boolean; cond3: boolean }): string {
    const a = cond1 ? 'a' : 'b';
    const b = cond2 ?? 'fallback';
    const c = cond3?.toString();
    const d = cond1 && 'value';
    const e = cond2 || 'fallback';

    const effect = () => {
        if (cond1) { return; }
        if (cond2) { return; }
    };

    const handler = () => {
        if (cond3) { return; }
    };

    const mapper = (x: string) => cond1 ? x : 'other';

    return a + b + (c ?? '') + d + e;
}
