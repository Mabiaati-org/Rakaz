import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE_KEY = 'rakaz:skipEnvelope';

/** For handlers that write the response themselves (e.g. server-sent events). */
export const SkipEnvelope = (): MethodDecorator => SetMetadata(SKIP_ENVELOPE_KEY, true);
