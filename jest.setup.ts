// Jest runs on Node, so native-only modules are replaced with light doubles here.
// The rotation math under src/lib/rotation is pure and needs none of this.

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = (props: { name?: string }) => React.createElement(Text, props, props.name ?? 'icon');
  Icon.glyphMap = {};
  return new Proxy({}, { get: () => Icon });
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hide: jest.fn(),
  hideAsync: jest.fn(async () => undefined),
  setOptions: jest.fn(),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file:///mock.pdf' })),
}));

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getCalendarsAsync: jest.fn(async () => []),
  getDefaultCalendarAsync: jest.fn(async () => ({ id: 'default', source: { id: 'src', name: 'Default' } })),
  createCalendarAsync: jest.fn(async () => 'cal-1'),
  createEventAsync: jest.fn(async () => 'evt-1'),
  deleteEventAsync: jest.fn(async () => undefined),
  getEventsAsync: jest.fn(async () => []),
  EntityTypes: { EVENT: 'event' },
  CalendarAccessLevel: { OWNER: 'owner' },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getOfferings: jest.fn(async () => ({ current: null, all: {} })),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DEBUG' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///mock.png'),
}));

jest.mock('expo-sqlite', () => {
  // A tiny in-memory stand in that understands the handful of statements the repository uses.
  const tables = new Map<string, Map<string, { json: string; updated_at: string }>>();
  const table = (name: string) => {
    let t = tables.get(name);
    if (!t) {
      t = new Map();
      tables.set(name, t);
    }
    return t;
  };
  return {
    openDatabaseSync: () => ({
      execSync: () => undefined,
      runSync: (sql: string, params: unknown[]) => {
        if (sql.startsWith('INSERT')) {
          const [tbl, id, json, updatedAt] = params as [string, string, string, string];
          table(tbl).set(id, { json, updated_at: updatedAt });
        } else if (sql.startsWith('DELETE')) {
          const [tbl, id] = params as [string, string | undefined];
          if (id === undefined) tables.delete(tbl);
          else table(tbl).delete(id);
        }
      },
      getAllSync: (_sql: string, params: unknown[]) => {
        const [tbl] = params as [string];
        return [...table(tbl).entries()].map(([id, row]) => ({ id, json: row.json }));
      },
      getFirstSync: (_sql: string, params: unknown[]) => {
        const [tbl, id] = params as [string, string];
        const row = table(tbl).get(id);
        return row ? { id, json: row.json } : null;
      },
    }),
  };
});
