/**
 * CSV Data Provider for MAD LAB IDE
 * Provides data from CSV files or CSV strings
 */

import { BaseDataSource, DataFrame, DataSourceConfig } from '../source';

export interface CSVOptions {
  data?: string;
  url?: string;
  delimiter?: string;
  headers?: boolean;
  skipLines?: number;
  encoding?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class CSVProvider extends BaseDataSource {
  private parsedData: Array<Record<string, unknown>> = [];
  private options: CSVOptions;

  constructor(config: DataSourceConfig & { options: CSVOptions }) {
    super(config);
    this.options = {
      delimiter: ',',
      headers: true,
      skipLines: 0,
      encoding: 'utf-8',
      ...config.options,
    };
  }

  async connect(): Promise<boolean> {
    try {
      let csvContent: string;

      if (this.options.data) {
        csvContent = this.options.data;
      } else if (this.options.url) {
        const response = await fetch(this.options.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV data: ${response.status}`);
        }
        csvContent = await response.text();
      } else {
        throw new Error('No data source provided (data or url)');
      }

      this.parsedData = this.parseCSV(csvContent);
      this.setConnected(true);
      return true;
    } catch (error) {
      console.error('CSVProvider connection error:', error);
      this.setConnected(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.parsedData = [];
    this.setConnected(false);
  }

  async getData(query?: Record<string, unknown>): Promise<DataFrame> {
    if (!this.connected || this.parsedData.length === 0) {
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

    let filteredData = [...this.parsedData];

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
    const columns = this.parsedData.length > 0 ? this.extractColumns(this.parsedData) : [];

    return {
      ...baseMetadata,
      schema: {
        columns: columns.map((col) => ({
          name: col,
          type: this.inferColumnType(this.parsedData, col),
          nullable: true,
        })),
      },
    };
  }

  private parseCSV(csvContent: string): Array<Record<string, unknown>> {
    const lines = csvContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length <= this.options.skipLines!) {
      return [];
    }

    const dataLines = lines.slice(this.options.skipLines!);

    if (dataLines.length === 0) {
      return [];
    }

    let headers: string[];
    let dataStartIndex: number;

    if (this.options.headers) {
      headers = this.parseLine(dataLines[0]);
      dataStartIndex = 1;
    } else {
      const firstRow = this.parseLine(dataLines[0]);
      headers = firstRow.map((_, index) => `column_${index}`);
      dataStartIndex = 0;
    }

    const data: Array<Record<string, unknown>> = [];

    for (let i = dataStartIndex; i < dataLines.length; i++) {
      const row = this.parseLine(dataLines[i]);

      if (row.length === 0) continue;

      const rowObject: Record<string, unknown> = {};

      for (let j = 0; j < headers.length; j++) {
        const value = j < row.length ? row[j] : '';
        rowObject[headers[j]] = this.parseValue(value);
      }

      data.push(rowObject);
    }

    return data;
  }

  private parseLine(line: string): string[] {
    const delimiter = this.options.delimiter!;
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current.trim());
    return result;
  }

  private parseValue(value: string): unknown {
    if (value === '' || value.toLowerCase() === 'null') {
      return null;
    }

    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }

    const numberValue = Number(value);
    if (!isNaN(numberValue) && value.trim() !== '') {
      return numberValue;
    }

    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateValue;
    }

    return value;
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
      const value = data[i]?.[column];
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
      const value = (row as Record<string, unknown>)[field];

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
