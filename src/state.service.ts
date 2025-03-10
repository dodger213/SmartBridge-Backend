import { Injectable } from '@nestjs/common';

@Injectable()
export class AppStateService {
  private apiEnabled = true;

  enableApi(): void {
    this.apiEnabled = true;
  }

  disableApi(): void {
    this.apiEnabled = false;
  }

  isApiEnabled(): boolean {
    return this.apiEnabled;
  }
}
