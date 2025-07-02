import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { createError } from '../middleware/errorHandler';

// ==============================================
// INTERFACES & TYPES
// ==============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  billing_email?: string;
  stripe_customer_id?: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
  settings: Record<string, any>;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  org_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  last_active: string;
  created_at: string;
  organization?: Organization;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  permissions: string[];
  rate_limit: number;
  allowed_ips?: string[];
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface ScanRecord {
  id: string;
  org_id: string;
  project_id?: string;
  user_id?: string;
  api_key_id?: string;
  image_url: string;
  image_filename?: string;
  image_size?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_time?: number;
  confidence_score?: number;
  cards_detected: any[];
  deck_analysis: Record<string, any>;
  formats_exported: string[];
  error_message?: string;
  source: 'web' | 'api' | 'discord' | 'mobile';
  created_at: string;
  completed_at?: string;
}

export interface AuthContext {
  user: User;
  appUser: AppUser;
  organization: Organization;
  permissions: string[];
}

// ==============================================
// SUPABASE SERVICE
// ==============================================

class SupabaseService {
  private client: SupabaseClient;
  private serviceClient: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Client for user operations (respects RLS)
    this.client = createClient(supabaseUrl, supabaseAnonKey);

    // Service client for admin operations (bypasses RLS)
    this.serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ==============================================
  // AUTHENTICATION
  // ==============================================

  /**
   * Create authenticated client with user session
   */
  createUserClient(accessToken: string): SupabaseClient {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );
  }

  /**
   * Get user from JWT token
   */
  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const { data, error } = await this.client.auth.getUser(token);
      return error ? null : data.user;
    } catch (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
  }

  /**
   * Get full app user context
   */
  async getAppUserContext(userId: string): Promise<AuthContext | null> {
    try {
      const { data: appUser, error } = await this.serviceClient
        .from('users')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('id', userId)
        .single();

      if (error || !appUser) {
        console.error('Error fetching app user:', error);
        return null;
      }

      return {
        user: { id: userId } as User, // Minimal user object
        appUser: appUser as AppUser,
        organization: appUser.organization as Organization,
        permissions: appUser.permissions || [],
      };
    } catch (error) {
      console.error('Error getting app user context:', error);
      return null;
    }
  }

  // ==============================================
  // ORGANIZATION MANAGEMENT
  // ==============================================

  async createOrganization(data: {
    name: string;
    slug: string;
    billing_email: string;
    plan?: 'free' | 'pro' | 'enterprise';
  }): Promise<Organization> {
    const { data: org, error } = await this.serviceClient
      .from('organizations')
      .insert({
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'free',
        billing_email: data.billing_email,
      })
      .select()
      .single();

    if (error) {
      throw createError(`Failed to create organization: ${error.message}`, 500);
    }

    return org as Organization;
  }

  async getOrganization(orgId: string): Promise<Organization | null> {
    const { data, error } = await this.serviceClient
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }

    return data as Organization;
  }

  async updateOrganization(
    orgId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    const { data, error } = await this.serviceClient
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    if (error) {
      throw createError(`Failed to update organization: ${error.message}`, 500);
    }

    return data as Organization;
  }

  // ==============================================
  // USER MANAGEMENT
  // ==============================================

  async createUser(data: {
    id: string; // From Supabase Auth
    org_id: string;
    email: string;
    full_name?: string;
    role?: 'owner' | 'admin' | 'member' | 'viewer';
  }): Promise<AppUser> {
    const { data: user, error } = await this.serviceClient
      .from('users')
      .insert({
        id: data.id,
        org_id: data.org_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'member',
      })
      .select()
      .single();

    if (error) {
      throw createError(`Failed to create user: ${error.message}`, 500);
    }

    return user as AppUser;
  }

  async getUsersByOrg(orgId: string): Promise<AppUser[]> {
    const { data, error } = await this.serviceClient
      .from('users')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError(`Failed to fetch users: ${error.message}`, 500);
    }

    return data as AppUser[];
  }

  async updateUserRole(
    userId: string,
    role: 'owner' | 'admin' | 'member' | 'viewer'
  ): Promise<AppUser> {
    const { data, error } = await this.serviceClient
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw createError(`Failed to update user role: ${error.message}`, 500);
    }

    return data as AppUser;
  }

  // ==============================================
  // API KEY MANAGEMENT
  // ==============================================

  async createApiKey(data: {
    org_id: string;
    created_by: string;
    name: string;
    key_hash: string;
    key_preview: string;
    permissions?: string[];
    rate_limit?: number;
    expires_at?: string;
  }): Promise<ApiKey> {
    const { data: apiKey, error } = await this.serviceClient
      .from('api_keys')
      .insert({
        org_id: data.org_id,
        created_by: data.created_by,
        name: data.name,
        key_hash: data.key_hash,
        key_preview: data.key_preview,
        permissions: data.permissions || ['scan', 'export'],
        rate_limit: data.rate_limit || 1000,
        expires_at: data.expires_at,
      })
      .select()
      .single();

    if (error) {
      throw createError(`Failed to create API key: ${error.message}`, 500);
    }

    return apiKey as ApiKey;
  }

  async getApiKeysByOrg(orgId: string): Promise<ApiKey[]> {
    const { data, error } = await this.serviceClient
      .from('api_keys')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError(`Failed to fetch API keys: ${error.message}`, 500);
    }

    return data as ApiKey[];
  }

  async validateApiKeyHash(keyHash: string): Promise<ApiKey | null> {
    const { data, error } = await this.serviceClient
      .from('api_keys')
      .select(`
        *,
        organization:organizations(name, plan)
      `)
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Update last_used
    await this.serviceClient
      .from('api_keys')
      .update({ 
        last_used: new Date().toISOString(),
        requests_count: (data.requests_count || 0) + 1 
      })
      .eq('id', data.id);

    return data as ApiKey;
  }

  async revokeApiKey(keyId: string): Promise<void> {
    const { error } = await this.serviceClient
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);

    if (error) {
      throw createError(`Failed to revoke API key: ${error.message}`, 500);
    }
  }

  // ==============================================
  // SCAN MANAGEMENT
  // ==============================================

  async createScan(data: {
    org_id: string;
    project_id?: string;
    user_id?: string;
    api_key_id?: string;
    image_url: string;
    image_filename?: string;
    image_size?: number;
    source: 'web' | 'api' | 'discord' | 'mobile';
    ip_address?: string;
    user_agent?: string;
  }): Promise<ScanRecord> {
    const { data: scan, error } = await this.serviceClient
      .from('scans')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw createError(`Failed to create scan: ${error.message}`, 500);
    }

    return scan as ScanRecord;
  }

  async updateScan(
    scanId: string,
    updates: Partial<ScanRecord>
  ): Promise<ScanRecord> {
    const { data, error } = await this.serviceClient
      .from('scans')
      .update(updates)
      .eq('id', scanId)
      .select()
      .single();

    if (error) {
      throw createError(`Failed to update scan: ${error.message}`, 500);
    }

    return data as ScanRecord;
  }

  async getScansByOrg(
    orgId: string,
    limit = 50,
    offset = 0
  ): Promise<ScanRecord[]> {
    const { data, error } = await this.serviceClient
      .from('scans')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw createError(`Failed to fetch scans: ${error.message}`, 500);
    }

    return data as ScanRecord[];
  }

  async getScan(scanId: string): Promise<ScanRecord | null> {
    const { data, error } = await this.serviceClient
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (error) {
      console.error('Error fetching scan:', error);
      return null;
    }

    return data as ScanRecord;
  }

  // ==============================================
  // USAGE TRACKING
  // ==============================================

  async logUsage(data: {
    org_id: string;
    user_id?: string;
    api_key_id?: string;
    scan_id?: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    tokens_used?: number;
    processing_time?: number;
    storage_bytes?: number;
    endpoint?: string;
    method?: string;
    status_code?: number;
    response_time?: number;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    try {
      await this.serviceClient
        .from('usage_logs')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log usage:', error);
      // Don't throw - usage logging is not critical
    }
  }

  async getUsageStats(
    orgId: string,
    period = '30 days'
  ): Promise<{
    scans: number;
    tokens: number;
    storage: number;
    requests: number;
  }> {
    const { data, error } = await this.serviceClient
      .from('usage_logs')
      .select('action, tokens_used, storage_bytes')
      .eq('org_id', orgId)
      .gte('created_at', new Date(Date.now() - this.parsePeriod(period)).toISOString());

    if (error) {
      throw createError(`Failed to get usage stats: ${error.message}`, 500);
    }

    const stats = data.reduce(
      (acc, log) => {
        if (log.action === 'scan') acc.scans++;
        acc.tokens += log.tokens_used || 0;
        acc.storage += log.storage_bytes || 0;
        acc.requests++;
        return acc;
      },
      { scans: 0, tokens: 0, storage: 0, requests: 0 }
    );

    return stats;
  }

  private parsePeriod(period: string): number {
    const match = period.match(/(\d+)\s*(day|week|month|year)s?/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // Default to 30 days

    const [, value, unit] = match;
    const multipliers = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    return parseInt(value) * multipliers[unit as keyof typeof multipliers];
  }

  // ==============================================
  // HEALTH CHECK
  // ==============================================

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('organizations')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// ==============================================
// MIDDLEWARE
// ==============================================

/**
 * Authentication middleware for Supabase JWT
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await supabaseService.getUserFromToken(token);
    
    if (!user) {
      throw createError('Invalid or expired token', 401);
    }

    const context = await supabaseService.getAppUserContext(user.id);
    if (!context) {
      throw createError('User not found in system', 401);
    }

    // Attach to request
    req.user = context.appUser;
    req.organization = context.organization;
    req.permissions = context.permissions;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * API Key authentication middleware
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw createError('Missing API key', 401);
    }

    // Hash the provided key to compare with stored hash
    const bcrypt = require('bcryptjs');
    const keyData = await supabaseService.validateApiKeyHash(
      await bcrypt.hash(apiKey, 12)
    );

    if (!keyData) {
      throw createError('Invalid or expired API key', 401);
    }

    // Get organization
    const organization = await supabaseService.getOrganization(keyData.org_id);
    if (!organization) {
      throw createError('Organization not found', 401);
    }

    // Attach to request
    req.apiKey = keyData;
    req.organization = organization;
    req.permissions = keyData.permissions;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Permission checking middleware
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPermissions = req.permissions || [];
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission) || userPermissions.includes('admin')
    );

    if (!hasPermission) {
      throw createError(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        403
      );
    }

    next();
  };
};

// ==============================================
// SINGLETON EXPORT
// ==============================================

export const supabaseService = new SupabaseService();
export default supabaseService;

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
      organization?: Organization;
      permissions?: string[];
      apiKey?: ApiKey;
    }
  }
} 