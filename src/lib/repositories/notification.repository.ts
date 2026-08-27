import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// NotificationRecord mirrors public.notifications
// (src/db/sql/009_contact01_notifications.sql). One row per delivery
// attempt per channel — see the migration file for why.
export type NotificationChannel = 'email' | 'whatsapp' | 'dashboard';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type NotificationRecipientType = 'hotel' | 'vendor';

export interface NotificationRecord extends DatabaseRecord {
  id: string;
  booking_id: string;
  recipient_type: NotificationRecipientType;
  recipient_email: string | null;
  recipient_phone: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  error_message: string | null;
  read_at: string | null;
  created_at: string;
  sent_at: string | null;
}

export class NotificationRepository extends BaseRepository<NotificationRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'notifications',
      softDelete: false,
    });
  }

  async createNotification(
    data: Parameters<BaseRepository<NotificationRecord>['create']>[0]
  ): Promise<NotificationRecord> {
    return this.create(data);
  }

  async markSent(id: string): Promise<NotificationRecord> {
    return this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  }

  async markFailed(
    id: string,
    errorMessage: string
  ): Promise<NotificationRecord> {
    return this.update(id, {
      status: 'failed',
      error_message: errorMessage,
    });
  }

  async markRead(id: string): Promise<NotificationRecord> {
    return this.update(id, {
      read_at: new Date().toISOString(),
    });
  }

  // Admin dashboard alert list — 'dashboard' channel rows only, most
  // recent first. Unread-first ordering is done client-side by the
  // caller; this just returns the page of rows.
  async listDashboardNotifications(
    page: number = 1,
    limit: number = 20
  ) {
    return this.findWithPagination({
      filters: [{ column: 'channel', operator: 'eq', value: 'dashboard' }],
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async countUnreadDashboardNotifications(): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'dashboard')
      .is('read_at', null);

    if (error) {
      throw new Error(
        `Failed to count unread notifications: ${error.message}`
      );
    }

    return count ?? 0;
  }
}

