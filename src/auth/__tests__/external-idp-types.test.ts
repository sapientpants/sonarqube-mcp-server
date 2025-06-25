import { describe, expect, it } from '@jest/globals';
import { PROVIDER_DEFAULTS } from '../external-idp-types.js';

describe('External IdP Types', () => {
  describe('PROVIDER_DEFAULTS', () => {
    it('should have defaults for all supported providers', () => {
      expect(PROVIDER_DEFAULTS).toHaveProperty('azure-ad');
      expect(PROVIDER_DEFAULTS).toHaveProperty('okta');
      expect(PROVIDER_DEFAULTS).toHaveProperty('auth0');
      expect(PROVIDER_DEFAULTS).toHaveProperty('keycloak');
      expect(PROVIDER_DEFAULTS).toHaveProperty('generic');
    });

    it('should have correct Azure AD defaults', () => {
      expect(PROVIDER_DEFAULTS['azure-ad']).toEqual({
        groupsClaim: 'groups',
        groupsTransform: 'extract_id',
      });
    });

    it('should have correct Okta defaults', () => {
      expect(PROVIDER_DEFAULTS['okta']).toEqual({
        groupsClaim: 'groups',
        groupsTransform: 'none',
      });
    });

    it('should have correct Auth0 defaults', () => {
      expect(PROVIDER_DEFAULTS['auth0']).toEqual({
        groupsClaim: 'https://auth0.com/groups',
        groupsTransform: 'none',
      });
    });

    it('should have correct Keycloak defaults', () => {
      expect(PROVIDER_DEFAULTS['keycloak']).toEqual({
        groupsClaim: 'groups',
        groupsTransform: 'extract_name',
      });
    });

    it('should have correct generic defaults', () => {
      expect(PROVIDER_DEFAULTS['generic']).toEqual({
        groupsClaim: 'groups',
        groupsTransform: 'none',
      });
    });
  });
});
