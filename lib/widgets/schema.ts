export interface WidgetProps {
  id: string;
  config: unknown;
  isSelected?: boolean;
  onConfigChange: (config: unknown) => void;
  onError?: (err: unknown) => void;
}

export interface WidgetDefinition {
  meta: {
    defaultConfig: unknown;
  };
  runtime: {
    component: React.ComponentType<WidgetProps>;
  };
}

export interface RegistryEntry {
  type: string;
  definition: WidgetDefinition;
}