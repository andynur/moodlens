/**
 * Build flag for the AI cut line (D-007). `MOODLENS_AI=off npm run build` ships the extension with every
 * AI control hidden and every AI message refused.
 */
export const AI_ENABLED: boolean = typeof __AI_ENABLED__ === 'boolean' ? __AI_ENABLED__ : true;
