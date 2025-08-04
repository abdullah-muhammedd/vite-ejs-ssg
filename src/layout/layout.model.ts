export interface NavItem {
  label: string;
  href: string;
}

export function getLayoutData(): {
  year: number;
  siteName: string;
  navItems: NavItem[];
} {
  return {
    year: new Date().getFullYear(),
    siteName: 'BrandName',
    navItems: [{ label: 'Home', href: '/' }],
  };
}
