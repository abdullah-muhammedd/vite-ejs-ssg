type Listener<T> = (value: T) => void;

export class GlobalStore {
  private state: Record<string, unknown> = {};
  private listeners: Record<string, Listener<any>[]> = {};
  private static _instance: GlobalStore;

  constructor() {
    throw new Error(
      'GlobalStore cannot be instantiated directly. Use GlobalStore.instance instead.'
    );
  }
  /** Singleton instance */
  static get instance(): GlobalStore {
    if (!GlobalStore._instance) {
      GlobalStore._instance = new GlobalStore();
    }
    return GlobalStore._instance;
  }

  /** Register a new state key with an initial value */
  register<T>(key: string, initialValue: T): void {
    if (this.state[key] !== undefined) {
      throw new Error(`State '${key}' already exists in GlobalStore`);
    }
    this.state[key] = initialValue;
    this.listeners[key] = [];
  }

  /** Set a new value and notify listeners */
  set<T>(key: string, value: T): void {
    if (!(key in this.state)) {
      throw new Error(`State '${key}' is not registered`);
    }
    this.state[key] = value;
    (this.listeners[key] || []).forEach(fn => fn(value));
  }

  /** Get current value */
  get<T>(key: string): T {
    if (!(key in this.state)) {
      throw new Error(`State '${key}' is not registered`);
    }
    return this.state[key] as T;
  }

  /** Subscribe to changes */
  subscribe<T>(key: string, fn: Listener<T>): () => void {
    if (!(key in this.state)) {
      throw new Error(`State '${key}' is not registered`);
    }
    this.listeners[key]!.push(fn);
    return () => {
      this.listeners[key] = (this.listeners[key] ?? []).filter(cb => cb !== fn);
    };
  }
}
