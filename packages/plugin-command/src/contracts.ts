declare const commandInput: unique symbol;
declare const commandOutput: unique symbol;

export interface Command<Input = void, Output = void> {
  readonly id: string;
  readonly [commandInput]: (input: Input) => Input;
  readonly [commandOutput]: (output: Output) => Output;
}

export interface CommandExecutionContext {
  readonly commandId: string;
  readonly signal: AbortSignal;
}

export interface CommandExecutionOptions {
  readonly signal?: AbortSignal;
}

export type CommandHandler<Input, Output> = (
  input: Input,
  context: CommandExecutionContext,
) => Output | PromiseLike<Output>;

export interface CommandRegistration {
  dispose(): Promise<void>;
}

export interface CommandService {
  register<Input, Output>(command: Command<Input, Output>, handler: CommandHandler<Input, Output>): CommandRegistration;
  execute<Input, Output>(
    command: Command<Input, Output>,
    input: Input,
    options?: CommandExecutionOptions,
  ): Promise<Output>;
}
