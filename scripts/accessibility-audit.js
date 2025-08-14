#!/usr/bin/env node

/**
 * Simple accessibility audit script for MAD LAB
 * Checks for basic WCAG 2.1 AA compliance requirements
 */

const fs = require('fs');
const path = require('path');

// WCAG 2.1 AA Requirements Checklist
const wcagChecklist = {
  // 1.1 Text Alternatives
  imageAlts: {
    name: '1.1.1 Non-text Content - Images have alt text',
    check: (content) => {
      const imgTags = content.match(/<img[^>]*>/g) || [];
      const imgWithoutAlt = imgTags.filter(img => !img.includes('alt='));
      return {
        passed: imgWithoutAlt.length === 0,
        details: imgWithoutAlt.length ? `${imgWithoutAlt.length} images missing alt text` : 'All images have alt text',
        count: { total: imgTags.length, missing: imgWithoutAlt.length }
      };
    }
  },

  // 1.3 Adaptable
  headingStructure: {
    name: '1.3.1 Info and Relationships - Proper heading structure',
    check: (content) => {
      const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g) || [];
      const levels = headings.map(h => parseInt(h.match(/h([1-6])/)[1]));
      
      let structureValid = true;
      let issues = [];
      
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i-1] + 1) {
          structureValid = false;
          issues.push(`Skipped from h${levels[i-1]} to h${levels[i]}`);
        }
      }
      
      return {
        passed: structureValid,
        details: structureValid ? 'Heading structure is logical' : `Issues: ${issues.join(', ')}`,
        count: { headings: headings.length, issues: issues.length }
      };
    }
  },

  // 2.1 Keyboard Accessible
  keyboardAccess: {
    name: '2.1.1 Keyboard - Interactive elements accessible via keyboard',
    check: (content) => {
      const interactiveElements = [
        ...content.match(/<button[^>]*>/g) || [],
        ...content.match(/<input[^>]*>/g) || [],
        ...content.match(/<select[^>]*>/g) || [],
        ...content.match(/<textarea[^>]*>/g) || [],
        ...content.match(/<a[^>]*href/g) || []
      ];
      
      const withoutTabIndex = interactiveElements.filter(el => 
        !el.includes('tabindex="-1"') && !el.includes('disabled')
      );
      
      return {
        passed: withoutTabIndex.length > 0,
        details: `${withoutTabIndex.length} keyboard accessible interactive elements`,
        count: { total: interactiveElements.length, accessible: withoutTabIndex.length }
      };
    }
  },

  // 2.4 Navigable
  skipLinks: {
    name: '2.4.1 Bypass Blocks - Skip links present',
    check: (content) => {
      const skipLinks = content.match(/skip-link|skip.*content/gi) || [];
      return {
        passed: skipLinks.length > 0,
        details: skipLinks.length ? `${skipLinks.length} skip links found` : 'No skip links found',
        count: { skipLinks: skipLinks.length }
      };
    }
  },

  // 3.1 Readable
  languageAttribute: {
    name: '3.1.1 Language of Page - HTML lang attribute',
    check: (content) => {
      const langAttribute = content.match(/<html[^>]*lang=["']([^"']+)["']/);
      return {
        passed: !!langAttribute,
        details: langAttribute ? `Language set to: ${langAttribute[1]}` : 'No lang attribute found',
        count: { found: langAttribute ? 1 : 0 }
      };
    }
  },

  // 4.1 Compatible
  ariaLabels: {
    name: '4.1.2 Name, Role, Value - ARIA labels and roles',
    check: (content) => {
      const ariaLabels = content.match(/aria-label=/g) || [];
      const ariaDescribedBy = content.match(/aria-describedby=/g) || [];
      const roles = content.match(/role=/g) || [];
      
      const totalAriaAttributes = ariaLabels.length + ariaDescribedBy.length + roles.length;
      
      return {
        passed: totalAriaAttributes > 10, // Expect reasonable coverage
        details: `${totalAriaAttributes} ARIA attributes found (labels: ${ariaLabels.length}, described-by: ${ariaDescribedBy.length}, roles: ${roles.length})`,
        count: { 
          ariaLabels: ariaLabels.length, 
          ariaDescribedBy: ariaDescribedBy.length, 
          roles: roles.length,
          total: totalAriaAttributes 
        }
      };
    }
  }
};

// Financial-specific accessibility checks
const financialChecks = {
  dataTableHeaders: {
    name: 'Financial Data Tables - Proper table headers',
    check: (content) => {
      const tables = content.match(/<table[^>]*>[\s\S]*?<\/table>/g) || [];
      const tablesWithHeaders = tables.filter(table => 
        table.includes('<th') || table.includes('scope=')
      );
      
      return {
        passed: tables.length === 0 || tablesWithHeaders.length === tables.length,
        details: `${tablesWithHeaders.length}/${tables.length} tables have proper headers`,
        count: { total: tables.length, withHeaders: tablesWithHeaders.length }
      };
    }
  },

  financialDataLabels: {
    name: 'Financial Data - Screen reader friendly formatting',
    check: (content) => {
      const financialClasses = content.match(/financial-data|tabular-nums/g) || [];
      const currencyFormats = content.match(/\$[\d,]+\.\d{2}/g) || [];
      
      return {
        passed: financialClasses.length > 0,
        details: `${financialClasses.length} financial data elements with proper formatting`,
        count: { 
          financialElements: financialClasses.length,
          currencyValues: currencyFormats.length 
        }
      };
    }
  }
};

// Scan all component files
function scanDirectory(dir) {
  let results = [];
  const files = fs.readdirSync(dir, { recursive: true });
  
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      results.push({ file: filePath, content });
    }
  }
  
  return results;
}

// Main audit function
function runAccessibilityAudit() {
  console.log('🔍 MAD LAB Accessibility Audit - WCAG 2.1 AA Compliance\n');
  
  const componentsDir = path.join(__dirname, '../components');
  const appDir = path.join(__dirname, '../app');
  
  const files = [
    ...scanDirectory(componentsDir),
    ...scanDirectory(appDir)
  ];
  
  const allContent = files.map(f => f.content).join('\n');
  
  console.log(`📊 Scanning ${files.length} files...\n`);
  
  // Run WCAG checks
  console.log('=== WCAG 2.1 AA Compliance ===\n');
  
  const wcagResults = [];
  for (const [key, check] of Object.entries(wcagChecklist)) {
    const result = check.check(allContent);
    wcagResults.push({ key, ...result, name: check.name });
    
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    console.log(`   ${result.details}\n`);
  }
  
  // Run financial-specific checks
  console.log('=== Financial Accessibility ===\n');
  
  const financialResults = [];
  for (const [key, check] of Object.entries(financialChecks)) {
    const result = check.check(allContent);
    financialResults.push({ key, ...result, name: check.name });
    
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    console.log(`   ${result.details}\n`);
  }
  
  // Summary
  const totalChecks = wcagResults.length + financialResults.length;
  const passedChecks = [...wcagResults, ...financialResults].filter(r => r.passed).length;
  const compliancePercentage = Math.round((passedChecks / totalChecks) * 100);
  
  console.log('=== Summary ===');
  console.log(`📈 Compliance Level: ${compliancePercentage}% (${passedChecks}/${totalChecks} checks passed)`);
  
  if (compliancePercentage >= 90) {
    console.log('🎉 Excellent accessibility compliance!');
  } else if (compliancePercentage >= 70) {
    console.log('👍 Good accessibility compliance with room for improvement');
  } else {
    console.log('⚠️  Accessibility needs attention');
  }
  
  // Recommendations
  const failedChecks = [...wcagResults, ...financialResults].filter(r => !r.passed);
  if (failedChecks.length > 0) {
    console.log('\n📋 Action Items:');
    failedChecks.forEach(check => {
      console.log(`   • ${check.name}: ${check.details}`);
    });
  }
  
  return { compliancePercentage, passedChecks, totalChecks };
}

// Run the audit
if (require.main === module) {
  runAccessibilityAudit();
}

module.exports = { runAccessibilityAudit };