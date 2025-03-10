import { Logger, Injectable } from '@nestjs/common';
import {
  createTransport,
  SendMailOptions,
  SentMessageInfo,
  Transporter,
} from 'nodemailer';
import { ConfigService } from './config/config.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly host: string;
  private readonly port: number;
  private readonly from: string;
  private readonly fromuser: string;
  private readonly frompass: string;
  private readonly to: string;
  private readonly cc: string;

  public constructor(private readonly configService: ConfigService) {
    this.host = this.configService.monitoringMailerHost;
    this.frompass = this.configService.monitoringMailerFromPassword;
    this.fromuser = this.configService.monitoringMailerFromUser;
    this.to = this.configService.monitoringMailerToAddress;
    this.host = this.configService.monitoringMailerHost;
    this.port = this.configService.monitoringMailerPort;
    this.cc = this.configService.monitoringMailerCc;
  }

  public async send(subject: string, html: string): Promise<void> {
    const transporter: Transporter = createTransport({
      host: this.host,
      port: this.port,
      requireTLS: true,
      auth: {
        user: this.fromuser,
        pass: this.frompass,
      },
    });
    const mailOptions: SendMailOptions = {
      from: this.from,
      to: this.to,
      cc: this.cc,
      subject,
      html,
    };
    try {
      const sent: SentMessageInfo = await transporter.sendMail(mailOptions);
      this.logger.debug(`Email sending successful: ' + ${sent.response}`);
    } catch (err) {
      this.logger.debug(`Email sending encountered an error: ${err}`);
      throw err;
    }
  }
}
