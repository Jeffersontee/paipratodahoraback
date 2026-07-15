import { AuthMiddleware } from './auth.middleware';
import { TenantMiddleware } from './tenant.middleware';
import { RequestMiddleware } from './request.middleware';
import { SubscriptionMiddleware } from './subscription.middleware';
import { PermissionMiddleware } from './permission.middleware';
import { LimitMiddleware } from './limit.middleware';
import { SecurityMiddleware } from './security.middleware';
import { ValidatorMiddleware } from './validator.middleware';

export const GlobalMiddleWare = {
    // Auth & Session
    auth: AuthMiddleware.authenticate,
    decodeRefreshToken: AuthMiddleware.decodeRefreshToken,
    adminRole: AuthMiddleware.adminRole,

    // Validation
    checkError: ValidatorMiddleware.checkError,

    // Multi-tenancy
    resolveTenant: TenantMiddleware.resolveTenant,

    // Request Handling
    handleRequestBody: RequestMiddleware.handleRequestBody,

    // Paywall & Subscriptions
    checkSubscriptionActive: SubscriptionMiddleware.checkSubscriptionActive,

    // Permissions & Ownership
    canManageItem: PermissionMiddleware.canManageItem,
    canManageProduct: PermissionMiddleware.canManageProduct,
    canCreateForEstablishment: PermissionMiddleware.canCreateForEstablishment,
    canManageBanner: PermissionMiddleware.canManageBanner,

    // Resource Limits
    checkProductLimit: LimitMiddleware.checkProductLimit,
    checkItemLimit: LimitMiddleware.checkItemLimit,
    checkUserLimit: LimitMiddleware.checkUserLimit,
    checkCategoryLimit: LimitMiddleware.checkCategoryLimit,
    checkBannerLimit: LimitMiddleware.checkBannerLimit,
    checkActiveGlobalBannerLimit: LimitMiddleware.checkActiveGlobalBannerLimit,

    // Security & IP block
    checkIPBlock: SecurityMiddleware.checkIPBlock
};
