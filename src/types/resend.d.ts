declare module "resend" {
  interface SendEmailRequest {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }

  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(payload: SendEmailRequest): Promise<unknown>;
    };
  }
}
