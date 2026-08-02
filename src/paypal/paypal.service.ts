/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaypalTokenResponse {
    scope: string,
    access_token: string,
    token_type: string,
    apple_id: string
    expires_in: number,
    nonce: string
}

export interface SubscripResponse {
    create_time: string
    id: string,
    links: string
    status: string
    message: string
}

@Injectable()
export class PaypalService {
  constructor(private config: ConfigService) {
    this.config = config;
    }

  async verifySubscription(subscriptionId: string) {
      const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
      const secret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
      if (!secret || !clientId) { //stops nestjs and throws error if either keys is missing
          throw new Error("'Missing PayPal credentials in environment con]figuration'")
      }
      const auth = Buffer.from(`${clientId}:${secret}`).toString('base64'); //encode to base64,paypal requirement

      // 1. Get access token from PayPal API (Live)
      const tokenRes = await fetch(`https://api-m.paypal.com/v1/oauth2/token`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: "grant_type=client_credentials"
      });

      const data = await tokenRes.json() as PaypalTokenResponse;
      const { access_token } = data;

      //2 verify subscription details
      const subscripRes = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
          headers: { Authorization: `Bearer ${access_token}` },
      });

      return await subscripRes.json() as SubscripResponse;
  }
}
