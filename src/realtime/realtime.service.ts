import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, finalize, interval, map, merge } from 'rxjs';
import { UserRole } from '../users/entities/user.entity';
import { RealtimeEvent } from './realtime.types';

// One open SSE connection. A single user may have several (multiple tabs).
interface Connection {
  userId: number;
  role: UserRole;
  subject: Subject<RealtimeEvent>;
}

// Push server → client events over Server-Sent Events. In-memory only: this
// works for a single API instance. For multi-instance deployments, back this
// with Redis pub/sub (or similar) so events fan out across instances.
@Injectable()
export class RealtimeService {
  private readonly connections = new Set<Connection>();

  // Called by the SSE controller when a client connects. Returns the stream
  // Nest serialises to the client; the connection is cleaned up on disconnect.
  connect(userId: number, role: UserRole): Observable<MessageEvent> {
    const connection: Connection = { userId, role, subject: new Subject() };
    this.connections.add(connection);

    // A periodic ping keeps proxies/load balancers from closing an idle stream.
    const heartbeat = interval(30_000).pipe(
      map((): RealtimeEvent => ({ type: 'ping' })),
    );

    return merge(connection.subject.asObservable(), heartbeat).pipe(
      map((data): MessageEvent => ({ data })),
      finalize(() => {
        this.connections.delete(connection);
        connection.subject.complete();
      }),
    );
  }

  // Send an event to every open connection for one user.
  emitToUser(userId: number, event: RealtimeEvent): void {
    for (const connection of this.connections) {
      if (connection.userId === userId) connection.subject.next(event);
    }
  }

  // Send an event to every connected user with the given role (e.g. all admins).
  emitToRole(role: UserRole, event: RealtimeEvent): void {
    for (const connection of this.connections) {
      if (connection.role === role) connection.subject.next(event);
    }
  }
}
