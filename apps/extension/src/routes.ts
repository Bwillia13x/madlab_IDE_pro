import { agentRoutes } from './routes/agent';
import { systemRoutes } from './routes/system';
import { fileRoutes } from './routes/files';
import { workspaceRoutes } from './routes/workspace';
import { dataRoutes } from './routes/data';
import type { RouteHandler } from './routes/types';

export const routes: Record<string, RouteHandler> = {
  ...systemRoutes,
  ...workspaceRoutes,
  ...fileRoutes,
  ...dataRoutes,
  ...agentRoutes,
};


