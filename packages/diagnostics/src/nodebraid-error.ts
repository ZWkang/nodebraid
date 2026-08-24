import { copyAndFreezeDiagnosticDetails, type DiagnosticAttributes } from './diagnostic-value';

const emptyDetails = Object.freeze({});

export interface NodeBraidErrorOptions<Details extends DiagnosticAttributes> {
  readonly details?: Details;
  readonly cause?: unknown;
}

export abstract class NodeBraidError<
  Domain extends string,
  Code extends string,
  Details extends DiagnosticAttributes = DiagnosticAttributes,
> extends Error {
  readonly cause?: unknown;
  readonly details: Details;

  constructor(
    readonly domain: Domain,
    readonly code: Code,
    message: string,
    options: NodeBraidErrorOptions<Details> = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.cause = options.cause;
    this.details = options.details ? copyAndFreezeDiagnosticDetails(options.details) : (emptyDetails as Details);
  }
}
