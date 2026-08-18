declare const commandInput: unique symbol;
declare const commandOutput: unique symbol;

/**
 * Runtime-unique Command identity. The ID is diagnostic metadata; callers must
 * use the exact token that was registered when they execute the Command.
 */
export interface Command<Input = void, Output = void> {
  readonly id: string;
  readonly [commandInput]: (input: Input) => Input;
  readonly [commandOutput]: (output: Output) => Output;
}

/** One invocation's metadata and cooperative cancellation signal. */
export interface CommandExecutionContext {
  readonly commandId: string;
  /** Aborts when the caller cancels or the Registration/Service begins disposal. */
  readonly signal: AbortSignal;
}

export interface CommandExecutionOptions {
  /** Aborts only this invocation's handler signal; the handler owns its final result or error. */
  readonly signal?: AbortSignal;
}

/** Synchronous and asynchronous handlers share the same Promise-returning execution seam. */
export type CommandHandler<Input, Output> = (
  input: Input,
  context: CommandExecutionContext,
) => Output | PromiseLike<Output>;

export interface CommandRegistration {
  /**
   * Makes the Command unavailable immediately, aborts its active handler
   * signals, and resolves after every handler settles. The token and ID remain
   * reserved until this Promise resolves.
   */
  dispose(): Promise<void>;
}

/** Activation-scoped Command registration and execution capability. */
export interface CommandService {
  /** Reserves both the token identity and its diagnostic ID until disposal completes. */
  register<Input, Output>(command: Command<Input, Output>, handler: CommandHandler<Input, Output>): CommandRegistration;
  /**
   * Invokes the registered handler and preserves its final value or error.
   * Cancellation is cooperative: handlers must observe the supplied signal.
   */
  execute<Input, Output>(
    command: Command<Input, Output>,
    input: Input,
    options?: CommandExecutionOptions,
  ): Promise<Output>;
}
