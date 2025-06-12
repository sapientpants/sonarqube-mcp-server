import { z } from 'zod';

/**
 * Schemas for security hotspots
 */

export const hotspotStatusSchema = z.enum(['TO_REVIEW', 'REVIEWED']).nullable().optional();

export const hotspotResolutionSchema = z.enum(['FIXED', 'SAFE']).nullable().optional();
