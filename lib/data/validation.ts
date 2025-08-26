import type { PricePoint, KpiData, FinancialData } from './provider.types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  quality: DataQuality;
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
  code: string;
}

export interface DataQuality {
  score: number; // 0-100
  completeness: number; // 0-100
  accuracy: number; // 0-100
  freshness: number; // 0-100
  consistency: number; // 0-100
}

interface ValidationRule {
  field: string;
  validator: (value: any, data?: any) => boolean;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export class DataValidator {
  private static instance: DataValidator;
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private dataPatterns: Map<string, RegExp> = new Map();
  
  constructor() {
    this.initializeValidationRules();
    this.initializeDataPatterns();
  }

  static getInstance(): DataValidator {
    if (!DataValidator.instance) {
      DataValidator.instance = new DataValidator();
    }
    return DataValidator.instance;
  }

  private initializeValidationRules(): void {
    // Price data validation rules
    this.validationRules.set('price', [
      {
        field: 'close',
        validator: (value: any) => typeof value === 'number' && value > 0,
        message: 'Close price must be a positive number',
        severity: 'critical'
      },
      {
        field: 'volume',
        validator: (value: any) => typeof value === 'number' && value >= 0,
        message: 'Volume must be a non-negative number',
        severity: 'high'
      },
      {
        field: 'date',
        validator: (value: any) => value instanceof Date && !isNaN(value.getTime()),
        message: 'Date must be a valid Date object',
        severity: 'critical'
      },
      {
        field: 'high',
        validator: (value: any, data: any) => 
          typeof value === 'number' && 
          typeof data.low === 'number' && 
          value >= data.low,
        message: 'High price must be greater than or equal to low price',
        severity: 'high'
      },
      {
        field: 'low',
        validator: (value: any, data: any) => 
          typeof value === 'number' && 
          typeof data.high === 'number' && 
          value <= data.high,
        message: 'Low price must be less than or equal to high price',
        severity: 'high'
      }
    ]);

    // KPI data validation rules
    this.validationRules.set('kpi', [
      {
        field: 'price',
        validator: (value: any) => typeof value === 'number' && value > 0,
        message: 'Price must be a positive number',
        severity: 'critical'
      },
      {
        field: 'changePercent',
        validator: (value: any) => typeof value === 'number' && value >= -100 && value <= 1000,
        message: 'Change percent must be between -100% and 1000%',
        severity: 'medium'
      },
      {
        field: 'volume',
        validator: (value: any) => typeof value === 'number' && value >= 0,
        message: 'Volume must be a non-negative number',
        severity: 'high'
      }
    ]);

    // Financial data validation rules
    this.validationRules.set('financial', [
      {
        field: 'revenue',
        validator: (value: any) => typeof value === 'number' && value >= 0,
        message: 'Revenue must be a non-negative number',
        severity: 'high'
      },
      {
        field: 'netIncome',
        validator: (value: any) => typeof value === 'number',
        message: 'Net income must be a number',
        severity: 'medium'
      },
      {
        field: 'totalAssets',
        validator: (value: any) => typeof value === 'number' && value > 0,
        message: 'Total assets must be a positive number',
        severity: 'high'
      }
    ]);
  }

  private initializeDataPatterns(): void {
    // Symbol patterns for different markets
    this.dataPatterns.set('stock', /^[A-Z]{1,5}$/);
    this.dataPatterns.set('crypto', /^[A-Z]{2,10}$/);
    this.dataPatterns.set('forex', /^[A-Z]{6}$/);
    this.dataPatterns.set('options', /^[A-Z]{1,5}\d{6}[CP]\d{8}$/);
  }

  // Validate price data
  validatePriceData(data: PricePoint | PricePoint[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    if (Array.isArray(data)) {
      return this.validatePriceArray(data);
    }

    return this.validateSinglePrice(data);
  }

  // Validate KPI data
  validateKpiData(data: KpiData): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    const rules = this.validationRules.get('kpi') || [];
    
    for (const rule of rules) {
      try {
        if (!rule.validator(data[rule.field as keyof KpiData], data)) {
          result.errors.push({
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            code: `KPI_${rule.field.toUpperCase()}_INVALID`
          });
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push({
          field: rule.field,
          message: `Validation error: ${error}`,
          severity: 'critical',
          code: `KPI_${rule.field.toUpperCase()}_ERROR`
        });
        result.isValid = false;
      }
    }

    // Calculate quality metrics
    result.quality = this.calculateKpiQuality(data);
    
    // Generate suggestions
    result.suggestions = this.generateKpiSuggestions(data, result);

    return result;
  }

  // Validate financial data
  validateFinancialData(data: FinancialData): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    const rules = this.validationRules.get('financial') || [];
    
    for (const rule of rules) {
      try {
        if (!rule.validator(data[rule.field as keyof FinancialData], data)) {
          result.errors.push({
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            code: `FINANCIAL_${rule.field.toUpperCase()}_INVALID`
          });
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push({
          field: rule.field,
          message: `Validation error: ${error}`,
          severity: 'critical',
          code: `FINANCIAL_${rule.field.toUpperCase()}_ERROR`
        });
        result.isValid = false;
      }
    }

    // Calculate quality metrics
    result.quality = this.calculateFinancialQuality(data);
    
    // Generate suggestions
    result.suggestions = this.generateFinancialSuggestions(data, result);

    return result;
  }

  // Validate symbol format
  validateSymbol(symbol: string, marketType: string = 'stock'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    const pattern = this.dataPatterns.get(marketType);
    
    if (!pattern) {
      result.warnings.push({
        field: 'symbol',
        message: `Unknown market type: ${marketType}`,
        suggestion: 'Use one of: stock, crypto, forex, options',
        code: 'SYMBOL_UNKNOWN_MARKET'
      });
    } else if (!pattern.test(symbol)) {
      result.errors.push({
        field: 'symbol',
        message: `Symbol ${symbol} does not match ${marketType} format`,
        severity: 'high',
        code: 'SYMBOL_FORMAT_INVALID'
      });
      result.isValid = false;
    }

    // Check for common symbol issues
    if (symbol.length === 0) {
      result.errors.push({
        field: 'symbol',
        message: 'Symbol cannot be empty',
        severity: 'critical',
        code: 'SYMBOL_EMPTY'
      });
      result.isValid = false;
    }

    if (symbol.length > 20) {
      result.warnings.push({
        field: 'symbol',
        message: 'Symbol is unusually long',
        suggestion: 'Verify symbol format',
        code: 'SYMBOL_TOO_LONG'
      });
    }

    return result;
  }

  // Validate data freshness
  validateDataFreshness(timestamp: Date | number, maxAgeMinutes: number = 5): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    const now = Date.now();
    const dataTime = timestamp instanceof Date ? timestamp.getTime() : timestamp;
    const ageMinutes = (now - dataTime) / (1000 * 60);

    if (ageMinutes > maxAgeMinutes) {
      result.errors.push({
        field: 'timestamp',
        message: `Data is ${ageMinutes.toFixed(1)} minutes old (max: ${maxAgeMinutes} minutes)`,
        severity: 'high',
        code: 'DATA_STALE'
      });
      result.isValid = false;
      result.quality.freshness = Math.max(0, 100 - (ageMinutes / maxAgeMinutes) * 100);
    } else if (ageMinutes > maxAgeMinutes * 0.8) {
      result.warnings.push({
        field: 'timestamp',
        message: `Data is ${ageMinutes.toFixed(1)} minutes old`,
        suggestion: 'Consider refreshing data soon',
        code: 'DATA_AGING'
      });
      result.quality.freshness = Math.max(0, 100 - (ageMinutes / maxAgeMinutes) * 50);
    }

    result.quality.score = Math.min(result.quality.score, result.quality.freshness);
    
    return result;
  }

  // Validate data consistency across multiple sources
  validateDataConsistency(dataSets: any[], tolerance: number = 0.01): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    if (dataSets.length < 2) {
      result.warnings.push({
        field: 'consistency',
        message: 'Need at least 2 data sets to check consistency',
        suggestion: 'Add more data sources for validation',
        code: 'CONSISTENCY_INSUFFICIENT_DATA'
      });
      return result;
    }

    // Check for significant differences in key fields
    const keyFields = ['close', 'price', 'volume'];
    
    for (const field of keyFields) {
      const values = dataSets
        .map(ds => ds[field])
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length < 2) continue;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const maxDeviation = Math.max(...values.map(v => Math.abs(v - mean) / mean));
      
      if (maxDeviation > tolerance) {
        result.warnings.push({
          field: 'consistency',
          message: `High variance in ${field}: ${(maxDeviation * 100).toFixed(2)}%`,
          suggestion: 'Verify data sources and check for data quality issues',
          code: 'CONSISTENCY_HIGH_VARIANCE'
        });
        result.quality.consistency = Math.max(0, 100 - (maxDeviation / tolerance) * 100);
      }
    }

    result.quality.score = Math.min(result.quality.score, result.quality.consistency);
    
    return result;
  }

  // Private helper methods
  private validatePriceArray(data: PricePoint[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    if (data.length === 0) {
      result.errors.push({
        field: 'data',
        message: 'Price data array is empty',
        severity: 'critical',
        code: 'PRICE_ARRAY_EMPTY'
      });
      result.isValid = false;
      return result;
    }

    // Validate each price point
    const validationResults = data.map(price => this.validateSinglePrice(price));
    const errors = validationResults.flatMap(r => r.errors);
    const warnings = validationResults.flatMap(r => r.warnings);

    result.errors.push(...errors);
    result.warnings.push(...warnings);
    result.isValid = errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0;

    // Calculate quality metrics
    result.quality = this.calculateArrayQuality(validationResults);

    return result;
  }

  private validateSinglePrice(data: PricePoint): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      quality: { score: 100, completeness: 100, accuracy: 100, freshness: 100, consistency: 100 },
      suggestions: []
    };

    const rules = this.validationRules.get('price') || [];
    
    for (const rule of rules) {
      try {
        if (!rule.validator(data[rule.field as keyof PricePoint], data)) {
          result.errors.push({
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            code: `PRICE_${rule.field.toUpperCase()}_INVALID`
          });
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push({
          field: rule.field,
          message: `Validation error: ${error}`,
          severity: 'critical',
          code: `PRICE_${rule.field.toUpperCase()}_ERROR`
        });
        result.isValid = false;
      }
    }

    // Check for data completeness
    const requiredFields = ['open', 'high', 'low', 'close', 'volume', 'date'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      result.warnings.push({
        field: 'completeness',
        message: `Missing fields: ${missingFields.join(', ')}`,
        suggestion: 'Ensure all required price data fields are present',
        code: 'PRICE_INCOMPLETE_DATA'
      });
      result.quality.completeness = Math.max(0, 100 - (missingFields.length / requiredFields.length) * 100);
    }

    result.quality.score = Math.min(result.quality.score, result.quality.completeness);
    
    return result;
  }

  private calculateKpiQuality(data: KpiData): DataQuality {
    const requiredFields = ['price', 'changePercent', 'volume'];
    const presentFields = requiredFields.filter(field => field in data);
    const completeness = (presentFields.length / requiredFields.length) * 100;

    return {
      score: completeness,
      completeness,
      accuracy: 100, // Would need historical data to calculate accuracy
      freshness: 100, // Would need timestamp to calculate freshness
      consistency: 100 // Would need multiple data points to calculate consistency
    };
  }

  private calculateFinancialQuality(data: FinancialData): DataQuality {
    const requiredFields = ['revenue', 'netIncome', 'totalAssets'];
    const presentFields = requiredFields.filter(field => field in data);
    const completeness = (presentFields.length / requiredFields.length) * 100;

    return {
      score: completeness,
      completeness,
      accuracy: 100,
      freshness: 100,
      consistency: 100
    };
  }

  private calculateArrayQuality(validationResults: ValidationResult[]): DataQuality {
    const totalResults = validationResults.length;
    const validResults = validationResults.filter(r => r.isValid).length;
    const avgCompleteness = validationResults.reduce((sum, r) => sum + r.quality.completeness, 0) / totalResults;
    const avgAccuracy = validationResults.reduce((sum, r) => sum + r.quality.accuracy, 0) / totalResults;
    const avgFreshness = validationResults.reduce((sum, r) => sum + r.quality.freshness, 0) / totalResults;
    const avgConsistency = validationResults.reduce((sum, r) => sum + r.quality.consistency, 0) / totalResults;

    return {
      score: (validResults / totalResults) * 100,
      completeness: avgCompleteness,
      accuracy: avgAccuracy,
      freshness: avgFreshness,
      consistency: avgConsistency
    };
  }

  private generateKpiSuggestions(data: KpiData, result: ValidationResult): string[] {
    const suggestions: string[] = [];

    if (result.quality.completeness < 100) {
      suggestions.push('Add missing KPI fields for complete data');
    }

    if (result.errors.some(e => e.field === 'changePercent')) {
      suggestions.push('Verify change percent calculation and data source');
    }

    if (result.errors.some(e => e.field === 'volume')) {
      suggestions.push('Check volume data source and calculation method');
    }

    return suggestions;
  }

  private generateFinancialSuggestions(data: FinancialData, result: ValidationResult): string[] {
    const suggestions: string[] = [];

    if (result.quality.completeness < 100) {
      suggestions.push('Add missing financial fields for complete analysis');
    }

    if (result.errors.some(e => e.field === 'revenue')) {
      suggestions.push('Verify revenue data source and calculation method');
    }

    if (result.errors.some(e => e.field === 'totalAssets')) {
      suggestions.push('Check total assets calculation and data source');
    }

    return suggestions;
  }
}

// Export singleton instance
export const dataValidator = DataValidator.getInstance();

// Types are already exported as interfaces above
