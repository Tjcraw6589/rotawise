import { useRouter } from 'expo-router';

import type { StoredOverride } from '@/lib/model';
import { formatHours } from '@/lib/format';
import { formatLongDate } from '@/lib/rotation';

import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Row } from './Row';

function title(o: StoredOverride): string {
  if (o.kind === 'trade') return o.direction === 'gave' ? `${o.counterpart || 'Someone'} works my shift` : `I work ${o.counterpart || 'someone'}'s shift`;
  if (o.kind === 'extra') return o.category === 'overtime' ? 'Overtime' : o.category === 'callback' ? 'Callback' : o.category === 'training' ? 'Training' : 'Extra shift';
  return o.leaveType === 'vacation' ? 'Vacation' : o.leaveType === 'sick' ? 'Sick day' : o.leaveType === 'kelly' ? 'Kelly day' : 'Leave';
}

function value(o: StoredOverride): string | undefined {
  if (o.kind === 'trade') return `${o.hours !== undefined ? formatHours(o.hours) : ''}${o.settled ? ', paid back' : ''}`;
  if (o.kind === 'extra') return formatHours(o.hours);
  return o.hours !== undefined ? formatHours(o.hours) : undefined;
}

/** A list of entries, newest first; tap to edit. */
export function EntryList({ entries, empty, testID }: { entries: StoredOverride[]; empty: string; testID?: string }) {
  const router = useRouter();
  if (entries.length === 0) return <EmptyState message={empty} testID={testID ? `${testID}-empty` : undefined} />;
  const sorted = [...entries].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  return (
    <Card padded={false} testID={testID}>
      {sorted.map((o, i) => (
        <Row
          key={o.id}
          title={title(o)}
          subtitle={`${formatLongDate(o.date)}, ${o.date.slice(0, 4)}${o.note ? `. ${o.note}` : ''}`}
          value={value(o)}
          onPress={() => router.push({ pathname: '/entry', params: { id: o.id } })}
          last={i === sorted.length - 1}
          testID={`entry-${o.id}`}
        />
      ))}
    </Card>
  );
}
