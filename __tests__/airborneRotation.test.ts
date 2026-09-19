import { rotationPivotShift } from '../src/ui/airborneRotation';

describe('rotationPivotShift', () => {
  it('is zero for a single stone, whichever way it turns', () => {
    expect(rotationPivotShift({ count: 1, orientation: 'horizontal' }, { count: 1, orientation: 'vertical' }, 30)).toEqual({
      dx: 0,
      dy: 0,
    });
  });

  it('shifts by half the size difference going from horizontal to vertical', () => {
    // 3 stones: 90x30 horizontal becomes 30x90 vertical.
    const shift = rotationPivotShift({ count: 3, orientation: 'horizontal' }, { count: 3, orientation: 'vertical' }, 30);
    expect(shift).toEqual({ dx: 30, dy: -30 });
  });

  it('reverses exactly when rotating back', () => {
    const there = rotationPivotShift({ count: 4, orientation: 'horizontal' }, { count: 4, orientation: 'vertical' }, 30);
    const back = rotationPivotShift({ count: 4, orientation: 'vertical' }, { count: 4, orientation: 'horizontal' }, 30);
    expect(back).toEqual({ dx: -there.dx, dy: -there.dy });
  });
});
