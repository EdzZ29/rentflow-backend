/* eslint-disable prettier/prettier */
import { Controller, Get, Param } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('paypal')
export class PaypalController {
    constructor(private paypalService: PaypalService) {
        this.paypalService = paypalService;
    }

    @Get('verify/:subsId')
    @Public()
    validateSubscriptionId(@Param('subsId') subsId: string) {
        return this.paypalService.verifySubscription(subsId);
    }
}
