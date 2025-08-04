import { promises as fs } from 'fs';
import { resolve, join } from 'path';

// Types
type ComponentType = 'page' | 'layout' | 'shared';
type ComponentConfig = {
  name: string;
  parent?: string;
  type: ComponentType;
};

// Helpers
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const exists = async (file: string) => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

const showHelp = () => {
  console.log(`
Usage: gen-component [options] <name>

Options:
  -p, --page <parent>    Generate a page component (requires parent page name)
  -l, --layout           Generate a layout component
  -s, --shared           Generate a shared component
  -h, --help             Show this help message

Examples:
  gen-component --page home button
  gen-component --layout header
  gen-component --shared modal
`);
  process.exit(0);
};

// Component generators
const generateComponentFiles = async (config: ComponentConfig) => {
  const { name, type, parent } = config;
  const className = `${capitalize(name)}Component`;

  // Determine paths based on component type
  let baseDir, clientPath, ejsPath;

  switch (type) {
    case 'page':
      // Validate parent page parameter
      if (!parent) {
        console.error(
          '✘: Parent page argument is required for page components'
        );
        console.log(
          'Usage: gen-component --page <parent-page-name> <component-name>'
        );
        process.exit(1);
      }

      // Validate parent page exists
      const parentPageDir = resolve('src/pages', parent);
      if (!(await exists(parentPageDir))) {
        console.error(
          `✘: Parent page "${parent}" does not exist in src/pages/`
        );
        console.log(
          'Please create the parent page first or check the spelling'
        );
        process.exit(1);
      }

      baseDir = resolve(parentPageDir, 'components', name);
      clientPath = join(baseDir, `${name}.client.ts`);
      ejsPath = join(baseDir, `${name}.component.ejs`);
      break;

    case 'layout':
      baseDir = resolve('src/layout/components', name);
      clientPath = join(baseDir, `${name}.client.ts`);
      ejsPath = join(baseDir, `${name}.component.ejs`);
      break;

    case 'shared':
      baseDir = resolve('src/design-system', name);
      ejsPath = join(baseDir, `${name}.component.ejs`);
      break;

    default:
      console.error(`✘ Unknown component type "${type}"`);
      process.exit(1);
  }

  // Check if component already exists
  if (await exists(baseDir)) {
    console.error(`✘ ${type} component "${name}" already exists at:`);
    console.error(`  ${baseDir}`);
    console.log('\nTo regenerate, first delete the existing component');
    process.exit(1);
  }

  // Create directory
  await fs.mkdir(baseDir, { recursive: true });
  console.log(`✓ Created directory: ${baseDir}`);

  // Generate EJS file
  if (!(await exists(ejsPath))) {
    const ejsContent =
      type === 'shared'
        ? `<!--
    Shared component: ${name}
    Usage:
      <%- include('src/lib/components/${name}/${name}.component.ejs', {
        text: 'Custom Text',
        extraClasses: 'additional-classes'
      }) %>

    Notes:
      - Pass data via the second argument to 'include'
      - Extend or override styles using 'extraClasses'
      - For interactive behavior, create a page-specific client script
        (e.g., in a page's .client.ts) targeting this component by selector
    -->

    <div class="<%= extraClasses || '' %>" data-${name}>
      <%= text || '${capitalize(name)}' %>
    </div>
    `
        : `<div data-${name}>
      ${capitalize(name)} ${type} component works!
    </div>
    `;

    await fs.writeFile(ejsPath, ejsContent);
    console.log(`✓ Created ${ejsPath}`);
  }

  // Generate client file (except for shared components)
  if (type !== 'shared' && clientPath && !(await exists(clientPath))) {
    const clientContent = `import { Component } from '${type === 'page' ? '../../../../lib/component.js' : '../../../lib/component.js'}';

export class ${className} extends Component {
  constructor() {
    super('[data-${name}]');
  }

  init() {
    console.log('${name} ${type} component initialized');
  }
}
`;
    await fs.writeFile(clientPath, clientContent);
    console.log(`✓ Created ${clientPath}`);
  }

  // Update parent files based on component type
  if (type === 'page' && parent) {
    await updatePageFiles(parent, name, className);
  } else if (type === 'layout') {
    await updateLayoutFiles(name, className);
  }

  console.log(`\n✓ Successfully generated ${type} component: ${name}`);
};

const updatePageFiles = async (
  parent: string,
  name: string,
  className: string
) => {
  const pageDir = resolve('src/pages', parent);
  const pageClientPath = join(pageDir, `${parent}.client.ts`);

  // Ensure page.client.ts exists
  if (!(await exists(pageClientPath))) {
    await fs.writeFile(pageClientPath, '');
  }

  // Read & update page.client.ts
  let pageClient = await fs.readFile(pageClientPath, 'utf-8');
  const importLine = `import { ${className} } from './components/${name}/${name}.client.js';`;
  const instLine = `new ${className}().init();`;

  if (!pageClient.includes(importLine)) {
    pageClient = importLine + '\n' + pageClient;
  }
  if (!pageClient.includes(instLine)) {
    pageClient += '\n' + instLine;
  }

  await fs.writeFile(pageClientPath, pageClient.trim() + '\n');
  console.log(`✓ Updated ${pageClientPath}`);

  // Update main.ts
  const mainPath = resolve('src/main.ts');
  let mainContent = await fs.readFile(mainPath, 'utf-8');
  const pageImport = `import './pages/${parent}/${parent}.client.js';`;

  if (!mainContent.includes(pageImport)) {
    mainContent += '\n' + pageImport;
    await fs.writeFile(mainPath, mainContent.trim() + '\n');
    console.log(`✓ Updated ${mainPath}`);
  }
};

const updateLayoutFiles = async (name: string, className: string) => {
  const layoutClientPath = resolve('src/layout/layout.client.ts');
  let layoutClientContent = '';

  try {
    layoutClientContent = await fs.readFile(layoutClientPath, 'utf-8');
  } catch {
    // Create new if missing
    layoutClientContent = `// Initialize layout components\n`;
  }

  const importLine = `import { ${className} } from './components/${name}/${name}.client.js';`;
  const initLine = `new ${className}().init();`;

  if (!layoutClientContent.includes(importLine)) {
    layoutClientContent =
      importLine + '\n' + layoutClientContent + '\n' + initLine + '\n';
    await fs.writeFile(layoutClientPath, layoutClientContent, 'utf-8');
    console.log(`✓ Updated ${layoutClientPath}`);
  }

  // Update main.ts
  const mainPath = resolve('src/main.ts');
  let mainContent = await fs.readFile(mainPath, 'utf-8');
  const mainImportLine = `import './layout/layout.client.js';`;

  if (!mainContent.includes(mainImportLine)) {
    const lines = mainContent.split('\n');
    const lastImportIndex = lines
      .map(l => l.trim())
      .reduce((idx, line, i) => (line.startsWith('import ') ? i : idx), -1);

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, mainImportLine);
      mainContent = lines.join('\n');
    } else {
      mainContent = mainImportLine + '\n' + mainContent;
    }

    await fs.writeFile(mainPath, mainContent, 'utf-8');
    console.log(`✓ Updated ${mainPath}`);
  }
};

// Simple argument parsing
const args = process.argv.slice(2);
let config: Partial<ComponentConfig> = {};

if (args.includes('-h') || args.includes('--help')) {
  showHelp();
}

if (args.includes('-p') || args.includes('--page')) {
  const index = args.findIndex(a => a === '-p' || a === '--page');
  const parent = args[index + 1];
  const name = args[index + 2];

  if (!parent || !name) {
    console.error('✘ --page requires parent page and component name');
    showHelp();
    process.exit(1);
  }

  config = { type: 'page', parent, name };
} else if (args.includes('-l') || args.includes('--layout')) {
  const index = args.findIndex(a => a === '-l' || a === '--layout');
  const name = args[index + 1];

  if (!name) {
    console.error('✘ --layout requires component name');
    showHelp();
    process.exit(1);
  }

  config = { type: 'layout', name };
} else if (args.includes('-s') || args.includes('--shared')) {
  const index = args.findIndex(a => a === '-s' || a === '--shared');
  const name = args[index + 1];

  if (!name) {
    console.error('✘ --shared requires component name');
    showHelp();
    process.exit(1);
  }

  config = { type: 'shared', name };
} else if (args.length === 0) {
  showHelp();
} else {
  console.error('✘ Invalid arguments');
  showHelp();
  process.exit(1);
}

// Main execution
if (config.type && config.name) {
  generateComponentFiles(config as ComponentConfig).catch(error => {
    console.error('✘', error.message);
    process.exit(1);
  });
}
