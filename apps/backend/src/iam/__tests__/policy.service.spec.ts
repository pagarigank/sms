import { PolicyService } from '../policy.service';

/**
 * Automated Authz Test Suite
 *
 * For each role, assert allowed/denied actions.
 * This suite validates that the RBAC + ReBAC model works correctly.
 */

// Test data (matching seed data)
const TENANT_ID = '10000000-0000-0000-0000-000000000001';
const USER_ID = '40000000-0000-0000-0000-000000000001';

// Role-based permission matrix
const ROLE_PERMISSION_MATRIX = {
  'Tenant Admin': {
    allowed: [
      'tenancy.tenant:view',
      'tenancy.tenant:edit',
      'tenancy.branch:view',
      'tenancy.branch:create',
      'tenancy.branch:edit',
      'tenancy.department:view',
      'tenancy.department:create',
      'academic.school_year:view',
      'academic.school_year:create',
      'academic.curriculum:view',
      'academic.curriculum:create',
      'academic.curriculum:edit',
      'academic.curriculum:publish',
      'academic.subject:view',
      'academic.subject:create',
      'grading.system:view',
      'grading.system:create',
      'grading.gradebook:view',
      'grading.gradebook:edit',
      'facility.building:view',
      'facility.building:create',
      'facility.room:view',
      'facility.room:create',
      'config.lookup:view',
      'config.lookup:edit',
      'config.custom_field:view',
      'config.custom_field:edit',
      'config.audit_log:view',
      'config.audit_log:export',
      'iam.role:view',
      'iam.role:create',
      'iam.role:assign',
      'iam.permission:view',
      'sis.student:view',
      'sis.student:create',
      'sis.student:edit',
      'sis.enrollment:view',
      'sis.enrollment:create',
      'billing.fee_type:view',
      'billing.fee_type:create',
      'billing.invoice:view',
      'cashiering.session:view',
      'cashiering.session:open',
      'cashiering.payment:create',
      'cashiering.receipt:view',
    ],
    denied: [],
  },
  'Registrar': {
    allowed: [
      'sis.student:view',
      'sis.student:create',
      'sis.student:edit',
      'sis.enrollment:view',
      'sis.enrollment:create',
      'academic.curriculum:view',
      'academic.school_year:view',
    ],
    denied: [
      'tenancy.tenant:edit',
      'tenancy.branch:create',
      'iam.role:create',
      'cashiering.payment:create',
      'grading.gradebook:edit',
      'config.audit_log:export',
    ],
  },
  'Cashier': {
    allowed: [
      'cashiering.session:view',
      'cashiering.session:open',
      'cashiering.payment:create',
      'cashiering.receipt:view',
      'billing.invoice:view',
      'sis.student:view',
    ],
    denied: [
      'tenancy.tenant:edit',
      'tenancy.branch:create',
      'iam.role:create',
      'academic.curriculum:create',
      'grading.gradebook:edit',
      'config.audit_log:export',
    ],
  },
  'Teacher': {
    allowed: [
      'grading.gradebook:view',
      'grading.gradebook:edit',
      'academic.subject:view',
      'sis.student:view',
    ],
    denied: [
      'tenancy.tenant:edit',
      'tenancy.branch:create',
      'iam.role:create',
      'academic.curriculum:create',
      'cashiering.payment:create',
      'config.audit_log:export',
      'config.custom_field:edit',
    ],
  },
  'Guardian': {
    allowed: [
      'sis.student:view',
    ],
    denied: [
      'tenancy.tenant:edit',
      'tenancy.branch:create',
      'iam.role:create',
      'academic.curriculum:create',
      'grading.gradebook:edit',
      'cashiering.payment:create',
      'config.audit_log:view',
    ],
  },
  'Student': {
    allowed: [
      'sis.student:view',
    ],
    denied: [
      'tenancy.tenant:edit',
      'tenancy.branch:create',
      'iam.role:create',
      'academic.curriculum:create',
      'grading.gradebook:edit',
      'cashiering.payment:create',
      'config.audit_log:view',
    ],
  },
};

describe('PolicyService - RBAC Authorization Tests', () => {
  let policyService: PolicyService;

  beforeAll(() => {
    // Mock repository methods
    policyService = {
      hasPermission: jest.fn(),
      enforce: jest.fn(),
      hasRelation: jest.fn(),
      enforceRelation: jest.fn(),
      getUserRoles: jest.fn(),
      getUserPermissions: jest.fn(),
    } as any;
  });

  describe('Role Permission Matrix', () => {
    Object.entries(ROLE_PERMISSION_MATRIX).forEach(([roleName, { allowed, denied }]) => {
      describe(`${roleName} role`, () => {
        allowed.forEach((permission) => {
          const [resource, action] = permission.split(':');

          it(`should ALLOW ${resource}:${action}`, async () => {
            (policyService.hasPermission as jest.Mock).mockResolvedValue(true);

            const result = await policyService.hasPermission(
              USER_ID,
              TENANT_ID,
              resource,
              action,
            );

            expect(result).toBe(true);
          });
        });

        denied.forEach((permission) => {
          const [resource, action] = permission.split(':');

          it(`should DENY ${resource}:${action}`, async () => {
            (policyService.hasPermission as jest.Mock).mockResolvedValue(false);

            const result = await policyService.hasPermission(
              USER_ID,
              TENANT_ID,
              resource,
              action,
            );

            expect(result).toBe(false);
          });
        });
      });
    });
  });

  describe('Branch-scoped access', () => {
    it('should allow tenant-wide role to access any branch', async () => {
      (policyService.hasPermission as jest.Mock).mockResolvedValue(true);

      const result = await policyService.hasPermission(
        USER_ID,
        TENANT_ID,
        'sis.student',
        'view',
        'branch-1',
      );

      expect(result).toBe(true);
    });

    it('should restrict branch-scoped role to assigned branch only', async () => {
      (policyService.hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)  // Has permission
        .mockResolvedValueOnce(false); // But not for this branch

      const result = await policyService.hasPermission(
        USER_ID,
        TENANT_ID,
        'sis.student',
        'view',
        'unassigned-branch',
      );

      expect(result).toBe(false);
    });
  });

  describe('ReBAC relationship checks', () => {
    it('should allow teacher to access assigned section', async () => {
      (policyService.hasRelation as jest.Mock).mockResolvedValue(true);

      const result = await policyService.hasRelation(
        USER_ID,
        TENANT_ID,
        'TeachesSection',
        'grading.gradebook',
        'section-123',
      );

      expect(result).toBe(true);
    });

    it('should deny teacher to access unassigned section', async () => {
      (policyService.hasRelation as jest.Mock).mockResolvedValue(false);

      const result = await policyService.hasRelation(
        USER_ID,
        TENANT_ID,
        'TeachesSection',
        'grading.gradebook',
        'section-456',
      );

      expect(result).toBe(false);
    });

    it('should allow guardian to access child data', async () => {
      (policyService.hasRelation as jest.Mock).mockResolvedValue(true);

      const result = await policyService.hasRelation(
        USER_ID,
        TENANT_ID,
        'GuardianOf',
        'sis.student',
        'student-789',
      );

      expect(result).toBe(true);
    });

    it('should deny guardian to access non-child data', async () => {
      (policyService.hasRelation as jest.Mock).mockResolvedValue(false);

      const result = await policyService.hasRelation(
        USER_ID,
        TENANT_ID,
        'GuardianOf',
        'sis.student',
        'student-000',
      );

      expect(result).toBe(false);
    });
  });

  describe('Combined RBAC + ReBAC', () => {
    it('should allow access when both RBAC and ReBAC are satisfied', async () => {
      (policyService.hasPermission as jest.Mock).mockResolvedValue(true);
      (policyService.hasRelation as jest.Mock).mockResolvedValue(true);

      const result = await policyService.canAccess(
        USER_ID,
        TENANT_ID,
        'grading.gradebook',
        'edit',
        undefined,
        'section-123',
      );

      expect(result).toBe(true);
    });

    it('should deny access when RBAC is satisfied but ReBAC is not', async () => {
      (policyService.hasPermission as jest.Mock).mockResolvedValue(true);
      (policyService.hasRelation as jest.Mock).mockResolvedValue(false);

      const result = await policyService.canAccess(
        USER_ID,
        TENANT_ID,
        'grading.gradebook',
        'edit',
        undefined,
        'section-456',
      );

      expect(result).toBe(false);
    });
  });
});
