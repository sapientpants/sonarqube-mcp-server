/**
 * Type alias for severity levels
 */
export type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page: number | undefined;
  pageSize: number | undefined;
}
