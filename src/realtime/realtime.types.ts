import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { Notification } from '../notifications/entities/notification.entity';

// Events pushed to clients over the SSE stream.
//  - `notification`: a new bell notification for the recipient.
//  - `reservation` : a booking was created/updated — clients should refresh
//    their reservation lists and dashboards (no page reload needed).
//  - `activity`    : a new owner activity-log entry (live activity feed).
export type RealtimeEvent =
  | { type: 'notification'; notification: Notification }
  | { type: 'reservation'; action: 'created' | 'updated'; reservationId: number }
  | { type: 'review'; action: 'created' | 'replied'; reviewId: number }
  | { type: 'support'; action: 'created' | 'message' | 'updated'; ticketId: number }
  | { type: 'activity'; log: ActivityLog }
  | { type: 'ping' };
