import type { Preview } from "@storybook/react";
import { setAccessibilityEngine } from "@storybook/addon-a11y";
import { axe, toHaveNoViolations } from "jasmine-axe";
import "../src/styles/index.css";

// Configure axe for accessibility testing
setAccessibilityEngine(axe);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      // Enable automatic prop documentation from TypeScript
      expanded: true,
    },
    docs: {
      description: {
        component:
          "Interactive component documentation with accessibility audit.",
      },
    },
    a11y: {
      // Run accessibility checks on all stories
      disable: false,
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
          {
            id: "button-name",
            enabled: true,
          },
          {
            id: "image-alt",
            enabled: true,
          },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for all stories",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", icon: "circlehollow", title: "light" },
          { value: "dark", icon: "circle", title: "dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

// Add global styles and theme switching
export const decorators = [
  (story, context) => {
    const theme = context.globals.theme || "light";

    // Set the theme on the root element
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;

    return story();
  },
];

export default preview;
