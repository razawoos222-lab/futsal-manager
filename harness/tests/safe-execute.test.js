import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript } from '../bootstrap.js';

describe('safeExecute', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
  });

  it('성공 시 { success: true, data }', () => {
    const res = ctx.api.safeExecute(() => ({ ok: 1 }));
    expect(res).toEqual({ success: true, data: { ok: 1 } });
  });

  it('예외 시 { success: false, message }', () => {
    const res = ctx.api.safeExecute(() => {
      throw new Error('테스트 오류');
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe('테스트 오류');
  });
});
