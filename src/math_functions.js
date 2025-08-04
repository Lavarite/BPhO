export const abs     = Math.abs;
export const pow     = Math.pow;
export const min     = Math.min;
export const max     = Math.max;
export const floor   = Math.floor;
export const sin     = Math.sin;
export const cos     = Math.cos;
export const tan     = Math.tan;
export const atan2   = Math.atan2;
export const asin    = Math.asin;
export const acos    = Math.acos;
export const atan    = Math.atan;
export const PI      = Math.PI;
export const hypot   = Math.hypot;
export const sqrt    = Math.sqrt;
export const round   = Math.round;
export const ceil    = Math.ceil;
export const sq      = (v) => v * v;
export const toDeg   = 180 / PI;
export const distance = (x1, y1, x2, y2) => hypot(x2 - x1, y2 - y1);
export const sign    = Math.sign;
export const clamp   = (value, low, high) => Math.max(low, Math.min(high, value));

export const getIncidentAngle = (dx, dy) => abs(atan2(dx, abs(dy)) * toDeg);

export const norm  = v => {
    const len = Math.hypot(v.x, v.y) || 1e-9;
    return { x: v.x / len, y: v.y / len };
};
export const dot   = (a, b) => a.x * b.x + a.y * b.y;
export const sub   = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const add   = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const mul   = (v, k) => ({ x: v.x * k, y: v.y * k });

