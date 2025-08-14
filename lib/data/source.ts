/**
 * DataSource Interface and DataFrame Type for MAD LAB IDE
 * Provides abstractions for data integration layer
 */

export interface DataFrame {
  columns: string[];
  rows: Record<string, any>[];
  metadata?: {
    source?: string;
    lastUpdated?: Date;
    rowCount?: number;
    columnTypes?: Record<string, string>;
  };
}

export interface DataSource {
  id: string;
  name: string;
  type: 'static-json' | 'csv' | 'rest' | 'websocket' | 'file';
  
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  
  getData(query?: any): Promise<DataFrame>;
  
  isConnected(): boolean;
  getMetadata(): {
    name: string;
    type: string;
    lastConnected?: Date;
    schema?: {
      columns: Array<{
        name: string;
        type: string;
        nullable?: boolean;
      }>;
    };
  };
}

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'static-json' | 'csv' | 'rest' | 'websocket' | 'file';
  options: Record<string, any>;
}

export abstract class BaseDataSource implements DataSource {
  protected config: DataSourceConfig;
  protected connected: boolean = false;
  protected lastConnected?: Date;

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get type(): 'static-json' | 'csv' | 'rest' | 'websocket' | 'file' {
    return this.config.type;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract getData(query?: any): Promise<DataFrame>;

  isConnected(): boolean {
    return this.connected;
  }

  getMetadata() {
    return {
      name: this.name,
      type: this.type,
      lastConnected: this.lastConnected,
    };
  }

  protected setConnected(connected: boolean): void {
    this.connected = connected;
    if (connected) {
      this.lastConnected = new Date();
    }
  }
}