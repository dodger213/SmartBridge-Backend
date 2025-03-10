import { mock, instance, when, verify, anything, reset } from 'ts-mockito';
import { AppService } from './app.service';
import { EmailService } from './emailsender.service';
import { IOService } from './io.service';
import { MonitoringService } from './monitoring.service';
import { AppStateService } from './state.service';

describe('MonitoringService', () => {
  const MockIOService = mock(IOService);
  const ioService = instance(MockIOService);
  const MockEmailService = mock(EmailService);
  const emailService = instance(MockEmailService);
  const MockAppService = mock(AppService);
  const MockAppStateService = mock(AppStateService);
  const appStateService = instance(MockAppStateService);

  const service = new MonitoringService(
    ioService,
    emailService,
    appStateService,
  );

  const toFlake = (hyd: BigInt): BigInt => {
    return BigInt(hyd) * BigInt(1e8);
  };

  beforeEach(() => {
    reset(MockIOService);
    reset(MockAppService);
    reset(MockEmailService);
  });

  it('Does not do anything if we have more HYD than WHYD', async () => {
    when(MockIOService.getWHYDContractBalance()).thenResolve(
      toFlake(BigInt(100)),
    );
    when(MockIOService.getLockHydAddressBalance()).thenResolve(
      toFlake(BigInt(110)),
    );
    when(MockAppStateService.isApiEnabled()).thenReturn(true);

    await service.checkBalances();
    verify(MockAppStateService.disableApi()).never();
    verify(MockAppStateService.enableApi()).never();
    verify(MockEmailService.send(anything(), anything())).never();
  });

  it('Disables app service and sends one email if we have more WHYD than HYD', async () => {
    when(MockIOService.getWHYDContractBalance()).thenResolve(
      toFlake(BigInt(100)),
    );
    when(MockIOService.getLockHydAddressBalance()).thenResolve(
      toFlake(BigInt(90)),
    );
    when(MockAppStateService.isApiEnabled()).thenReturn(true);

    await service.checkBalances();
    verify(MockAppStateService.disableApi()).times(1);
    verify(MockAppStateService.enableApi()).never();
    verify(MockEmailService.send(anything(), anything())).times(1);

    // simulate it was really called
    when(MockAppStateService.isApiEnabled()).thenReturn(false);

    await service.checkBalances();
    verify(MockAppStateService.disableApi()).times(1);
    verify(MockAppStateService.enableApi()).never();
    verify(MockEmailService.send(anything(), anything())).times(1);
  });
});
