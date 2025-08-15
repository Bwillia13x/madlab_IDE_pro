/**
 * Static JSON Data Provider for MAD LAB IDE
 * Provides data from static JSON objects or files
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseDataSource, DataFrame, DataSourceConfig } from '../source';

export interface StaticJSONOptions {
  data?: Array<Record<string, unknown>>;
  url?: string;
  jsonPath?: string;
}

export class StaticJSONProvider extends BaseDataSource {
  private data: Array<Record<string, unknown>> = [];
  private options: StaticJSONOptions;

  constructor(config: DataSourceConfig & { options: StaticJSONOptions }) {
    super(config);
    this.options = config.options;
  }

  async connect(): Promise<boolean> {
    try {
      if (this.options.data) {
        this.data = Array.isArray(this.options.data) ? this.options.data : [this.options.data];
        this.setConnected(true);
        return true;
      }

      if (this.options.url) {
        const response = await fetch(this.options.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch JSON data: ${response.status}`);
        }

        const jsonData = await response.json();

        if (this.options.jsonPath) {
          this.data = this.extractDataFromPath(jsonData, this.options.jsonPath);
        } else {
          this.data = Array.isArray(jsonData) ? jsonData : [jsonData];
        }

        this.setConnected(true);
        return true;
      }

      throw new Error('No data source provided (data or url)');
    } catch (error) {
      console.error('StaticJSONProvider connection error:', error);
      this.setConnected(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.data = [];
    this.setConnected(false);
  }

  async getData(query?: Record<string, unknown>): Promise<DataFrame> {
    if (!this.connected || this.data.length === 0) {
      return {
        columns: [],
        rows: [],
        metadata: {
          source: this.name,
          lastUpdated: new Date(),
          rowCount: 0,
        },
      };
    }

    let filteredData = [...this.data];

    if (query) {
      filteredData = this.applyQuery(filteredData, query);
    }

    const columns = this.extractColumns(filteredData);
    const columnTypes = this.inferColumnTypes(filteredData, columns);

    return {
      columns,
      rows: filteredData,
      metadata: {
        source: this.name,
        lastUpdated: new Date(),
        rowCount: filteredData.length,
        columnTypes,
      },
    };
  }

  getMetadata() {
    const baseMetadata = super.getMetadata();
    const columns = this.data.length > 0 ? this.extractColumns(this.data) : [];

    return {
      ...baseMetadata,
      schema: {
        columns: columns.map((col) => ({
          name: col,
          type: this.inferColumnType(this.data, col),
          nullable: true,
        })),
      },
    };
  }

  private extractDataFromPath(data: unknown, path: string): Array<Record<string, unknown>> {
    const pathSegments = path.split('.');
    let current: unknown = data;

    for (const segment of pathSegments) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        throw new Error(`Invalid JSON path: ${path}`);
      }
    }

    return Array.isArray(current)
      ? (current as Array<Record<string, unknown>>)
      : [current as Record<string, unknown>];
  }

  private extractColumns(data: Array<Record<string, unknown>>): string[] {
    if (data.length === 0) return [];

    const columnSet = new Set<string>();

    for (const row of data) {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((key) => columnSet.add(key));
      }
    }

    return Array.from(columnSet).sort();
  }

  private inferColumnTypes(
    data: Array<Record<string, unknown>>,
    columns: string[]
  ): Record<string, string> {
    const types: Record<string, string> = {};

    for (const column of columns) {
      types[column] = this.inferColumnType(data, column);
    }

    return types;
  }

  private inferColumnType(data: Array<Record<string, unknown>>, column: string): string {
    const sampleSize = Math.min(data.length, 10);
    const typeCounts: Record<string, number> = {};

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i]?.[column as keyof (typeof data)[number]] as unknown;
      const type = this.getValueType(value);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    let maxType = 'string';
    let maxCount = 0;

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }

    return maxType;
  }

  private getValueType(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private applyQuery(
    data: Array<Record<string, unknown>>,
    query: Record<string, unknown>
  ): Array<Record<string, unknown>> {
    let result = [...data];

    if (query.filter) {
      result = result.filter((row) =>
        this.matchesFilter(row, query.filter as Record<string, unknown>)
      );
    }

    if (query.sort) {
      result = this.sortData(result, query.sort as Record<string, unknown>);
    }

    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    if (query.offset) {
      result = result.slice(query.offset);
    }

    return result;
  }

  private matchesFilter(row: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    for (const [field, condition] of Object.entries(filter)) {
      const value = row[field];

      if (typeof condition === 'object' && condition !== null) {
        for (const [operator, operand] of Object.entries(condition as Record<string, unknown>)) {
          switch (operator) {
            case '$eq':
              if (value !== operand) return false;
              break;
            case '$ne':
              if (value === operand) return false;
              break;
            case '$gt':
              if (value <= operand) return false;
              break;
            case '$gte':
              if (value < operand) return false;
              break;
            case '$lt':
              if (value >= operand) return false;
              break;
            case '$lte':
              if (value > operand) return false;
              break;
            case '$in':
              if (!Array.isArray(operand) || !operand.includes(value)) return false;
              break;
            case '$nin':
              if (Array.isArray(operand) && operand.includes(value)) return false;
              break;
            case '$contains':
              if (!String(value).toLowerCase().includes(String(operand).toLowerCase()))
                return false;
              break;
          }
        }
      } else {
        if (value !== condition) return false;
      }
    }

    return true;
  }

  private sortData(
    data: Array<Record<string, unknown>>,
    sort: Record<string, unknown>
  ): Array<Record<string, unknown>> {
    return data.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = a[field as keyof typeof a] as unknown;
        const bVal = b[field as keyof typeof b] as unknown;
        const dir = direction === 'desc' || direction === -1 ? -1 : 1;

        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
      }
      return 0;
    });
  }
}
