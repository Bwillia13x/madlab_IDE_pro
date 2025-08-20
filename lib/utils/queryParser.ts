// Quick query parser for stock screener
// Supports syntax like: pe<20 fcfy>5 ivrank>50 sector:tech mcap>10

export interface ParsedQuery {
  filters: {
    mcap?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    pe?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    ev?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    fcf?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    mom?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    atr?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    adv?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    spr?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    iv?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    ivr?: { operator: '<' | '>' | '=' | '<=' | '>='; value: number };
    sectors?: string[];
    optionable?: boolean;
    exUS?: boolean;
  };
  errors: string[];
}

// Mapping of query terms to filter properties
const FILTER_MAPPINGS: Record<string, string> = {
  'pe': 'pe',
  'p/e': 'pe',
  'priceearnings': 'pe',
  'mcap': 'mcap',
  'marketcap': 'mcap',
  'mktcap': 'mcap',
  'ev': 'ev',
  'evebitda': 'ev',
  'ev/ebitda': 'ev',
  'fcf': 'fcf',
  'fcfy': 'fcf',
  'fcfyield': 'fcf',
  'freecashflow': 'fcf',
  'mom': 'mom',
  'momentum': 'mom',
  '3m': 'mom',
  'atr': 'atr',
  'volatility': 'atr',
  'vol': 'atr',
  'adv': 'adv',
  'volume': 'adv',
  'liquidity': 'adv',
  'spr': 'spr',
  'spread': 'spr',
  'bidask': 'spr',
  'iv': 'iv',
  'impliedvol': 'iv',
  'iv30': 'iv',
  'ivr': 'ivr',
  'ivrank': 'ivr',
  'impliedvolrank': 'ivr'
};

// Sector abbreviations
const SECTOR_MAPPINGS: Record<string, string> = {
  'tech': 'Tech',
  'technology': 'Tech',
  'fin': 'Fin',
  'financial': 'Fin',
  'financials': 'Fin',
  'disc': 'Disc',
  'discretionary': 'Disc',
  'consumer': 'Disc',
  'stap': 'Stap',
  'staples': 'Stap',
  'hc': 'HC',
  'healthcare': 'HC',
  'health': 'HC',
  'indu': 'Indu',
  'industrials': 'Indu',
  'industrial': 'Indu',
  'energy': 'Energy',
  'util': 'Util',
  'utilities': 'Util',
  're': 'RE',
  'realestate': 'RE',
  'real': 'RE',
  'mat': 'Mat',
  'materials': 'Mat',
  'comm': 'Comm',
  'communication': 'Comm',
  'telecom': 'Comm'
};

export function parseQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    filters: {},
    errors: []
  };

  if (!query.trim()) {
    return result;
  }

  // Split query into tokens
  const tokens = query.toLowerCase().trim().split(/\s+/);

  for (const token of tokens) {
    try {
      // Handle boolean flags
      if (token === 'optionable' || token === 'options') {
        result.filters.optionable = true;
        continue;
      }

      if (token === 'exus' || token === 'international') {
        result.filters.exUS = true;
        continue;
      }

      // Handle sector filters
      if (token.startsWith('sector:') || token.startsWith('sec:')) {
        const sectorValue = token.split(':')[1];
        if (sectorValue) {
          const mappedSector = SECTOR_MAPPINGS[sectorValue];
          if (mappedSector) {
            if (!result.filters.sectors) result.filters.sectors = [];
            result.filters.sectors.push(mappedSector);
          } else {
            result.errors.push(`Unknown sector: ${sectorValue}`);
          }
        }
        continue;
      }

      // Handle numeric comparisons: field operator value
      const numericMatch = token.match(/^([a-z/]+)([<>=]+)(.+)$/);
      if (numericMatch) {
        const [, field, operator, valueStr] = numericMatch;
        
        // Map field name
        const mappedField = FILTER_MAPPINGS[field];
        if (!mappedField) {
          result.errors.push(`Unknown field: ${field}`);
          continue;
        }

        // Validate operator
        if (!['<', '>', '=', '<=', '>='].includes(operator)) {
          result.errors.push(`Invalid operator: ${operator}`);
          continue;
        }

        // Parse value
        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          result.errors.push(`Invalid number: ${valueStr}`);
          continue;
        }

        // Set filter
        (result.filters as Record<string, unknown>)[mappedField] = {
          operator: operator as '<' | '>' | '=' | '<=' | '>=',
          value
        };
        continue;
      }

      // If we get here, the token wasn't recognized
      result.errors.push(`Unrecognized term: ${token}`);
    } catch (error) {
      result.errors.push(`Error parsing "${token}": ${error}`);
    }
  }

  return result;
}

// Convert parsed query to filter state
export function applyParsedQuery<T extends object>(
  parsedQuery: ParsedQuery,
  currentFilters: T
): T {
  const newFilters = { ...(currentFilters as unknown as Record<string, unknown>) } as Record<string, unknown>;

  // Apply numeric filters
  const numericFields = ['mcap', 'pe', 'ev', 'fcf', 'mom', 'atr', 'adv', 'spr', 'iv', 'ivr'];
  
  for (const field of numericFields) {
    const filter = (parsedQuery.filters as Record<string, unknown>)[field];
    if (filter && typeof filter === 'object' && filter !== null) {
      const filterObj = filter as { operator: string; value: number };
      // Convert relative operators to absolute values
      switch (filterObj.operator) {
        case '<':
        case '<=':
          if (field === 'mcap') (newFilters as Record<string, unknown>).mcap = Math.max(1, filterObj.value);
          else if (field === 'pe') (newFilters as Record<string, unknown>).pe = Math.max(1, filterObj.value);
          else if (field === 'ev') (newFilters as Record<string, unknown>).ev = Math.max(1, filterObj.value);
          else if (field === 'atr') (newFilters as Record<string, unknown>).atr = Math.max(1, filterObj.value);
          else if (field === 'spr') (newFilters as Record<string, unknown>).spr = Math.max(1, filterObj.value);
          else if (field === 'iv') (newFilters as Record<string, unknown>).iv = Math.max(1, filterObj.value);
          break;
        case '>':
        case '>=':
          if (field === 'fcf') (newFilters as Record<string, unknown>).fcf = filterObj.value;
          else if (field === 'mom') (newFilters as Record<string, unknown>).mom = filterObj.value;
          else if (field === 'adv') (newFilters as Record<string, unknown>).adv = filterObj.value;
          else if (field === 'ivr') (newFilters as Record<string, unknown>).ivr = filterObj.value;
          else if (field === 'mcap') (newFilters as Record<string, unknown>).mcap = filterObj.value;
          break;
        case '=':
          // For equality, set both bounds close to the value
          if (field === 'pe') (newFilters as Record<string, unknown>).pe = filterObj.value + 1;
          break;
      }
    }
  }

  // Apply boolean filters
  if (parsedQuery.filters.optionable !== undefined) {
    (newFilters as Record<string, unknown>).optionable = parsedQuery.filters.optionable;
  }

  if (parsedQuery.filters.exUS !== undefined) {
    (newFilters as Record<string, unknown>).exUS = parsedQuery.filters.exUS;
  }

  // Apply sectors
  if (parsedQuery.filters.sectors && parsedQuery.filters.sectors.length > 0) {
    (newFilters as Record<string, unknown>).sectors = new Set(parsedQuery.filters.sectors);
  }

  return newFilters as unknown as T;
}

// Get example queries for help
export function getExampleQueries(): string[] {
  return [
    'pe<20 fcfy>5',
    'mcap>10 sector:tech',
    'ivrank>50 optionable',
    'pe<15 ev<12 mom>0',
    'sector:fin sector:tech',
    'fcfy>3 atr<10 adv>25',
    'ivr>60 spr<25 optionable',
    'mcap>5 pe<30 mom>10'
  ];
}