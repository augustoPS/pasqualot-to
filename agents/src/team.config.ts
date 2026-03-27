import { directorConfig } from './agents/director.js';
import { researcherConfig } from './agents/researcher.js';
import { criticConfig } from './agents/critic.js';
import { synthesizerConfig } from './agents/synthesizer.js';
import { developerFrontendConfig } from './agents/developer_frontend.js';
import { developerBackendConfig } from './agents/developer_backend.js';
import { developerDevopsConfig } from './agents/developer_devops.js';
import { testerConfig } from './agents/tester.js';
import { securityConfig } from './agents/security.js';
import { productOwnerConfig } from './agents/product_owner.js';
import type { TeamConfig } from './types.js';

export const teamConfig: TeamConfig = {
  sharedContext: `You are part of a cross-functional software team. The team operates asynchronously and communicates through structured outputs. Each member has a distinct role and perspective — respect the boundaries, but collaborate across them.

Team norms:
- Be direct. Long preambles waste everyone's time.
- Decisions are recorded in shared memory so they are not re-litigated.
- Raising a concern is always valid. Blocking without a reason is not.
- "Done" means it meets the acceptance criteria, is tested, is secure, and is deployed. Not "works locally."
- When in doubt, surface the uncertainty rather than resolve it silently.`,
  agents: [
    directorConfig,
    productOwnerConfig,
    researcherConfig,
    developerFrontendConfig,
    developerBackendConfig,
    developerDevopsConfig,
    testerConfig,
    securityConfig,
    criticConfig,
    synthesizerConfig,
  ],
};
