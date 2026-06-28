import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentLang = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req?.locale || 'en';
});
