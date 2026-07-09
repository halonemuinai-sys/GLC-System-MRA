import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs';

export function useMDXComponents(components) {
  const themeComponents = getThemeComponents();
  return {
    ...themeComponents,
    ...components,
  };
}
