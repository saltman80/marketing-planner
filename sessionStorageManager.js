const STORAGE_KEY = 'marketingPlannerState';
const inMemoryStore = {};

const hasWindow = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

let sessionStorageAvailable = false;
if (hasWindow) {
  try {
    const testKey = '__storage_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    sessionStorageAvailable = true;
  } catch (e) {
    sessionStorageAvailable = false;
  }
}

function isSessionStorageAvailable() {
  return sessionStorageAvailable;
}

function init(defaultState = {}) {
  const initialState = {
    steps: [],
    prompt: '',
    config: {},
    createdAt: new Date().toISOString(),
    ...defaultState
  };
  if (sessionStorageAvailable) {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.warn('Corrupted sessionStorage data, resetting to default state.', e);
          try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
          } catch (writeErr) {
            console.error('Failed to write initial state to sessionStorage.', writeErr);
          }
          return initialState;
        }
      } else {
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
        } catch (writeErr) {
          console.error('Failed to write initial state to sessionStorage.', writeErr);
        }
        return initialState;
      }
    } catch (e) {
      console.error('Error accessing sessionStorage during initialization.', e);
      inMemoryStore[STORAGE_KEY] = initialState;
      return initialState;
    }
  } else {
    if (!inMemoryStore[STORAGE_KEY]) {
      inMemoryStore[STORAGE_KEY] = initialState;
    }
    return inMemoryStore[STORAGE_KEY];
  }
}

function getState() {
  if (sessionStorageAvailable) {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse sessionStorage data, clearing corrupted entry.', e);
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch (removeErr) {
          console.error('Failed to remove corrupted sessionStorage entry.', removeErr);
        }
        return null;
      }
    } catch (e) {
      console.error('Error accessing sessionStorage during getState.', e);
      return null;
    }
  } else {
    return inMemoryStore[STORAGE_KEY] || null;
  }
}

function setState(state) {
  let serialized;
  try {
    serialized = JSON.stringify(state);
  } catch (e) {
    console.error('Failed to serialize state.', e);
    return;
  }
  if (sessionStorageAvailable) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.error('Failed to write state to sessionStorage.', e);
    }
  } else {
    try {
      inMemoryStore[STORAGE_KEY] = JSON.parse(serialized);
    } catch {
      inMemoryStore[STORAGE_KEY] = state;
    }
  }
}

function updateState(updates) {
  const current = getState() || {};
  const next = typeof updates === 'function' ? updates(current) : { ...current, ...updates };
  setState(next);
  return next;
}

function clearState() {
  if (sessionStorageAvailable) {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove state from sessionStorage.', e);
    }
  }
  delete inMemoryStore[STORAGE_KEY];
}

window.sessionStorageManager = {
  isSessionStorageAvailable,
  init,
  getState,
  setState,
  updateState,
  clearState
};