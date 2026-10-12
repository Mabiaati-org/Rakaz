import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'rakaz:isPublic';

/** Marks a route as reachable without a bearer token. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
