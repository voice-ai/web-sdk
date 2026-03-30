import type {
  GoogleCalendarOperation,
  GoogleConnectionStatus,
  GoogleGmailOperation,
  GoogleManagedToolOperationOption,
  GoogleSheetsOperation,
  ManagedToolsConfig,
} from '../types';
import { IANA_TIMEZONE_OPTIONS } from './iana-timezones';

export const GOOGLE_IDENTITY_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const;

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
export const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export const GOOGLE_GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
export const GOOGLE_GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export const GOOGLE_CALENDAR_OPERATION_OPTIONS: GoogleManagedToolOperationOption<GoogleCalendarOperation>[] = [
  {
    value: 'google_calendar_check_availability',
    label: 'Check availability',
    description: 'Check whether a calendar is free during a time window.',
  },
  {
    value: 'google_calendar_list_upcoming_events',
    label: 'List upcoming',
    description: 'Read the next upcoming events from the calendar.',
  },
  {
    value: 'google_calendar_create_event',
    label: 'Create event',
    description: 'Create a new calendar event.',
  },
  {
    value: 'google_calendar_update_event',
    label: 'Update event',
    description: 'Modify an existing calendar event.',
  },
  {
    value: 'google_calendar_cancel_event',
    label: 'Cancel event',
    description: 'Cancel or delete an existing calendar event.',
  },
];

export const GOOGLE_SHEETS_OPERATION_OPTIONS: GoogleManagedToolOperationOption<GoogleSheetsOperation>[] = [
  {
    value: 'google_sheets_append_row',
    label: 'Append row',
    description: 'Write a new row into a spreadsheet.',
  },
  {
    value: 'google_sheets_list_sheets',
    label: 'List sheets',
    description: 'List worksheet tabs and spreadsheet metadata.',
  },
  {
    value: 'google_sheets_read_rows',
    label: 'Read rows',
    description: 'Read rows from a worksheet range.',
  },
];

export const GOOGLE_GMAIL_OPERATION_OPTIONS: GoogleManagedToolOperationOption<GoogleGmailOperation>[] = [
  {
    value: 'google_gmail_search_messages',
    label: 'Search messages',
    description: 'Search Gmail and return readable message summaries.',
  },
  {
    value: 'google_gmail_get_message',
    label: 'Get message',
    description: 'Fetch a specific Gmail message by ID.',
  },
  {
    value: 'google_gmail_send_email',
    label: 'Send email',
    description: 'Send an email from the connected Gmail account.',
  },
];

export const GOOGLE_MANAGED_OPERATION_OPTIONS = {
  google_calendar: GOOGLE_CALENDAR_OPERATION_OPTIONS,
  google_sheets: GOOGLE_SHEETS_OPERATION_OPTIONS,
  google_gmail: GOOGLE_GMAIL_OPERATION_OPTIONS,
} as const;

export { IANA_TIMEZONE_OPTIONS };

const GOOGLE_GMAIL_REQUIRED_SCOPES_BY_OPERATION: Record<GoogleGmailOperation, string[]> = {
  google_gmail_search_messages: [GOOGLE_GMAIL_READ_SCOPE],
  google_gmail_get_message: [GOOGLE_GMAIL_READ_SCOPE],
  google_gmail_send_email: [GOOGLE_GMAIL_SEND_SCOPE],
};

const GOOGLE_CALENDAR_REQUIRED_SCOPES_BY_OPERATION: Record<GoogleCalendarOperation, string[]> = {
  google_calendar_check_availability: [GOOGLE_CALENDAR_SCOPE],
  google_calendar_list_upcoming_events: [GOOGLE_CALENDAR_SCOPE],
  google_calendar_create_event: [GOOGLE_CALENDAR_SCOPE],
  google_calendar_update_event: [GOOGLE_CALENDAR_SCOPE],
  google_calendar_cancel_event: [GOOGLE_CALENDAR_SCOPE],
};

const GOOGLE_SHEETS_REQUIRED_SCOPES_BY_OPERATION: Record<GoogleSheetsOperation, string[]> = {
  google_sheets_append_row: [GOOGLE_SHEETS_SCOPE],
  google_sheets_list_sheets: [GOOGLE_SHEETS_SCOPE],
  google_sheets_read_rows: [GOOGLE_SHEETS_SCOPE],
};

function uniqueStrings(values: Iterable<string | null | undefined>): string[] {
  const orderedValues: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim() || seen.has(value)) {
      continue;
    }
    seen.add(value);
    orderedValues.push(value);
  }
  return orderedValues;
}

export function getManagedToolSelectedOperations<T extends string>(
  selectedOperations: string[] | null | undefined,
  options: readonly GoogleManagedToolOperationOption<T>[]
): T[] {
  const orderedValues = options.map((option) => option.value);
  if (!Array.isArray(selectedOperations)) {
    return orderedValues;
  }

  const allowed = new Set(orderedValues);
  const selected = new Set<T>();
  for (const operation of selectedOperations) {
    if (typeof operation === 'string' && allowed.has(operation as T)) {
      selected.add(operation as T);
    }
  }
  return orderedValues.filter((operation) => selected.has(operation));
}

export function toggleManagedToolOperation<T extends string>(
  selectedOperations: string[] | null | undefined,
  options: readonly GoogleManagedToolOperationOption<T>[],
  operation: T,
  checked: boolean
): T[] {
  const nextSelected = new Set(
    getManagedToolSelectedOperations(selectedOperations, options)
  );

  if (checked) {
    nextSelected.add(operation);
  } else {
    nextSelected.delete(operation);
  }

  return options
    .map((option) => option.value)
    .filter((value) => nextSelected.has(value));
}

export function getRequiredGoogleScopes(managedTools?: ManagedToolsConfig | null): string[] {
  const requiredScopes: string[] = [...GOOGLE_IDENTITY_SCOPES];

  if (managedTools?.google_calendar?.enabled) {
    for (const operation of getManagedToolSelectedOperations(
      managedTools.google_calendar.selected_operations,
      GOOGLE_CALENDAR_OPERATION_OPTIONS
    )) {
      requiredScopes.push(...(GOOGLE_CALENDAR_REQUIRED_SCOPES_BY_OPERATION[operation] || []));
    }
  }

  if (managedTools?.google_sheets?.enabled) {
    for (const operation of getManagedToolSelectedOperations(
      managedTools.google_sheets.selected_operations,
      GOOGLE_SHEETS_OPERATION_OPTIONS
    )) {
      requiredScopes.push(...(GOOGLE_SHEETS_REQUIRED_SCOPES_BY_OPERATION[operation] || []));
    }
  }

  if (managedTools?.google_gmail?.enabled) {
    for (const operation of getManagedToolSelectedOperations(
      managedTools.google_gmail.selected_operations,
      GOOGLE_GMAIL_OPERATION_OPTIONS
    )) {
      requiredScopes.push(...(GOOGLE_GMAIL_REQUIRED_SCOPES_BY_OPERATION[operation] || []));
    }
  }

  return uniqueStrings(requiredScopes);
}

export function getMissingGoogleScopes(
  requiredScopes: string[] | null | undefined,
  grantedScopes: string[] | null | undefined
): string[] {
  const grantedScopeSet = new Set(uniqueStrings(grantedScopes || []));
  return uniqueStrings(requiredScopes || []).filter((scope) => !grantedScopeSet.has(scope));
}

export function getMissingGoogleScopesForManagedTools(
  managedTools: ManagedToolsConfig | null | undefined,
  grantedScopes: string[] | null | undefined
): string[] {
  return getMissingGoogleScopes(getRequiredGoogleScopes(managedTools), grantedScopes);
}

export function isGoogleReconnectRequired(
  managedTools: ManagedToolsConfig | null | undefined,
  grantedScopes: string[] | null | undefined,
  connected: boolean
): boolean {
  return connected && getMissingGoogleScopesForManagedTools(managedTools, grantedScopes).length > 0;
}

export function getGoogleReconnectState(
  managedTools: ManagedToolsConfig | null | undefined,
  status: Pick<GoogleConnectionStatus, 'connected' | 'granted_scopes' | 'reconnect_required'> | null | undefined
): {
  required_scopes: string[];
  missing_scopes: string[];
  reconnect_required: boolean;
} {
  const required_scopes = getRequiredGoogleScopes(managedTools);
  const granted_scopes = status?.granted_scopes || [];
  const missing_scopes = getMissingGoogleScopes(required_scopes, granted_scopes);
  return {
    required_scopes,
    missing_scopes,
    reconnect_required:
      (Boolean(status?.connected) && missing_scopes.length > 0) ||
      Boolean(status?.reconnect_required),
  };
}

export function hasEnabledGoogleManagedTools(managedTools: ManagedToolsConfig | null | undefined): boolean {
  return Boolean(
    managedTools?.google_calendar?.enabled ||
      managedTools?.google_sheets?.enabled ||
      managedTools?.google_gmail?.enabled
  );
}
