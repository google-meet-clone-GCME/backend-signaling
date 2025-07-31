import { Test, TestingModule } from '@nestjs/testing';
import { SingalingGateway } from './singaling.gateway';

describe('SingalingGateway', () => {
  let gateway: SingalingGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SingalingGateway],
    }).compile();

    gateway = module.get<SingalingGateway>(SingalingGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
