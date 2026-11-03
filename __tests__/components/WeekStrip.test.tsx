import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { WeekStrip } from '@/components/WeekStrip';
import { defaultProfile } from '@/lib/model';
import { rotationFromPreset } from '@/lib/rotation';

import { resetStore } from '../helpers';

const profile = { ...defaultProfile('2027-01-01'), rotation: rotationFromPreset('24-48', '2027-01-01', null), platoon: 'A' as const };

function borderWidths(): number[] {
  const strip = screen.getByTestId('week-strip');
  return (strip.children as unknown as { props: { style: unknown } }[]).map((c) => (StyleSheet.flatten(c.props.style as never) as { borderWidth?: number }).borderWidth ?? 0);
}

describe('WeekStrip', () => {
  beforeEach(() => resetStore());

  it('outlines only today, not the first day of a later week', async () => {
    await render(<WeekStrip profile={profile} overrides={[]} from="2027-01-08" today="2027-01-01" />);
    expect(borderWidths().filter((w) => w === 2)).toHaveLength(0);
  });

  it('outlines today wherever it falls in the week', async () => {
    await render(<WeekStrip profile={profile} overrides={[]} from="2027-01-01" today="2027-01-03" />);
    const widths = borderWidths();
    expect(widths[2]).toBe(2);
    expect(widths.filter((w) => w === 2)).toHaveLength(1);
  });
});
