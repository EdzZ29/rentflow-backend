import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Public health check so the web/app (and load balancers) can probe the API.
  @Public()
  @Get('health')
  health() {
    return this.appService.getHealth();
  }
}
