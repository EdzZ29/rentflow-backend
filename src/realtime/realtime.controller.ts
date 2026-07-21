import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RealtimeService } from './realtime.service';

// Authenticated live event stream. The global JwtAuthGuard authenticates the
// request from the httpOnly `access_token` cookie, so the browser's native
// EventSource (with `withCredentials`) connects with no extra headers.
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse('stream')
  stream(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.realtime.connect(user.id, user.role);
  }
}
