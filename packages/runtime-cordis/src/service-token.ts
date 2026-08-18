import { PluginHostError } from './plugin-host-error';

declare const serviceIdentity: unique symbol;
declare const serviceType: unique symbol;

export interface ServiceTokenBase {
  readonly name: string;
  readonly [serviceIdentity]: true;
}

export interface ServiceToken<Service> extends ServiceTokenBase {
  // Input and output positions make the service type invariant, preventing a
  // narrower token from being widened and then provided with an invalid value.
  readonly [serviceType]: (service: Service) => Service;
}

export type ServiceBindings = Readonly<Record<string, ServiceTokenBase>>;

export type BoundServices<Bindings extends ServiceBindings> = Readonly<{
  [Binding in keyof Bindings]: Bindings[Binding] extends ServiceToken<infer Service> ? Service : never;
}>;

let nextServiceId = 0;
const serviceNames = new WeakMap<object, string>();

export function defineService<Service>(name: string): ServiceToken<Service> {
  const token = Object.freeze({ name }) as ServiceToken<Service>;
  serviceNames.set(token, `cflow.service.${++nextServiceId}`);
  return token;
}

export function getServiceName(token: ServiceTokenBase): string {
  const name = serviceNames.get(token);
  if (!name) {
    throw new PluginHostError('INVALID_DEFINITION', 'Service Token must be created with defineService().');
  }
  return name;
}
