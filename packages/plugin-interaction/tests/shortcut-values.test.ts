import { expect, test } from 'bun:test';

import { defineInteractionShortcut } from '../src';

test('Shortcut definition retains the nonempty code accepted from a getter', () => {
  let reads = 0;
  const source = {
    get code() {
      expect(this).toBe(source);
      reads += 1;
      return reads < 3 ? 'KeyP' : '';
    },
    modifierAlternatives: [{ alt: false, control: false, meta: false, shift: false }],
  };

  const shortcut = defineInteractionShortcut(source);

  expect(shortcut.code).toBe('KeyP');
  expect(reads).toBe(1);
  expect(Object.isFrozen(shortcut)).toBe(true);
});

test('Shortcut definition retains the nonempty alternatives accepted from a getter', () => {
  let reads = 0;
  const modifiers = { alt: false, control: true, meta: false, shift: false };
  const source = {
    code: 'KeyP',
    get modifierAlternatives() {
      expect(this).toBe(source);
      reads += 1;
      return reads < 3 ? [modifiers] : [];
    },
  };

  const shortcut = defineInteractionShortcut(source);

  expect(shortcut.modifierAlternatives).toEqual([modifiers]);
  expect(reads).toBe(1);
  expect(Object.isFrozen(shortcut.modifierAlternatives)).toBe(true);
});

test('Shortcut definition retains the modifier value accepted from a getter', () => {
  let reads = 0;
  const modifiers = {
    get alt() {
      expect(this).toBe(modifiers);
      reads += 1;
      return reads === 1 ? false : true;
    },
    control: false,
    meta: false,
    shift: false,
  };

  const shortcut = defineInteractionShortcut({ code: 'KeyP', modifierAlternatives: [modifiers] });

  expect(shortcut.modifierAlternatives[0]).toEqual({ alt: false, control: false, meta: false, shift: false });
  expect(reads).toBe(1);
  expect(Object.isFrozen(shortcut.modifierAlternatives[0])).toBe(true);
});

const modifierFields = ['alt', 'control', 'meta', 'shift'] as const;
const propertyKinds = ['enumerable', 'inherited', 'non-enumerable'] as const;

for (const field of modifierFields) {
  for (const kind of propertyKinds) {
    test.each([false, true])(`Shortcut retains first ${kind} ${field} value %p`, (first) => {
      const modifiers = { alt: false, control: false, meta: false, shift: false };
      let reads = 0;
      const descriptor = {
        enumerable: kind === 'enumerable',
        get(this: unknown) {
          expect(this).toBe(modifiers);
          reads += 1;
          if (reads > 1) throw new Error('Later reads must not replace an accepted modifier.');
          return first;
        },
      };
      if (kind === 'inherited') {
        Reflect.deleteProperty(modifiers, field);
        Object.setPrototypeOf(modifiers, Object.defineProperty({}, field, descriptor));
      } else Object.defineProperty(modifiers, field, descriptor);

      const shortcut = defineInteractionShortcut({ code: 'KeyT', modifierAlternatives: [modifiers] });

      expect(shortcut.modifierAlternatives[0]).toEqual({
        alt: false,
        control: false,
        meta: false,
        shift: false,
        [field]: first,
      });
      expect(reads).toBe(1);
    });
  }
}

const originalFailures: readonly unknown[] = [undefined, null, false, 0, '', Symbol('Shortcut getter')];
for (const field of ['code', 'modifierAlternatives', ...modifierFields] as const) {
  test.each([...originalFailures])(`Shortcut preserves the original ${field} getter failure %p`, (failure) => {
    const modifiers = { alt: false, control: false, meta: false, shift: false };
    const source = { code: 'KeyT', modifierAlternatives: [modifiers] };
    let reads = 0;
    Object.defineProperty(field === 'code' || field === 'modifierAlternatives' ? source : modifiers, field, {
      get() {
        reads += 1;
        throw failure;
      },
    });

    expect(failureOf(() => defineInteractionShortcut(source))).toBe(failure);
    expect(reads).toBe(1);
  });
}

test('Shortcut rejects the first empty code before reading alternatives', () => {
  let codeReads = 0;
  let alternativesReads = 0;
  const source = {
    get code() {
      codeReads += 1;
      return codeReads === 1 ? '' : 'KeyT';
    },
    get modifierAlternatives(): never {
      alternativesReads += 1;
      throw new Error('Later alternatives must not replace the first invalid code.');
    },
  };

  expect(failureOf(() => defineInteractionShortcut(source))).toMatchObject({ code: 'INVALID_SHORTCUT' });
  expect(codeReads).toBe(1);
  expect(alternativesReads).toBe(0);
});

test('Shortcut rejects the first empty alternatives instead of accepting a later collection', () => {
  let reads = 0;
  const source = {
    code: 'KeyT',
    get modifierAlternatives() {
      reads += 1;
      return reads === 1 ? [] : [{ alt: false, control: false, meta: false, shift: false }];
    },
  };

  expect(failureOf(() => defineInteractionShortcut(source))).toMatchObject({ code: 'INVALID_SHORTCUT' });
  expect(reads).toBe(1);
});

for (const invalidField of modifierFields) {
  test(`Shortcut rejects the first invalid ${invalidField} without reading later fields`, () => {
    const modifiers = { alt: false, control: false, meta: false, shift: false };
    const reads: string[] = [];
    const invalidIndex = modifierFields.indexOf(invalidField);
    for (const [index, field] of modifierFields.entries()) {
      Object.defineProperty(modifiers, field, {
        get() {
          reads.push(field);
          if (index > invalidIndex) throw new Error('A later field must not mask the first invalid modifier.');
          return index === invalidIndex ? undefined : false;
        },
      });
    }

    expect(
      failureOf(() => defineInteractionShortcut({ code: 'KeyT', modifierAlternatives: [modifiers] })),
    ).toMatchObject({
      code: 'INVALID_SHORTCUT',
    });
    expect(reads).toEqual(modifierFields.slice(0, invalidIndex + 1));
  });
}

test('Shortcut owns its alternatives and modifier shells after caller mutation', () => {
  const modifiers = { alt: false, control: true, meta: false, shift: false };
  const alternatives = [modifiers];
  const shortcut = defineInteractionShortcut({ code: 'KeyT', modifierAlternatives: alternatives });

  modifiers.control = false;
  alternatives.length = 0;

  expect(shortcut.modifierAlternatives).toEqual([{ alt: false, control: true, meta: false, shift: false }]);
  expect(Object.isFrozen(shortcut.modifierAlternatives)).toBe(true);
  expect(Object.isFrozen(shortcut.modifierAlternatives[0])).toBe(true);
});

function failureOf(callback: () => unknown): unknown {
  let threw = false;
  let failure: unknown;
  try {
    callback();
  } catch (error) {
    threw = true;
    failure = error;
  }
  expect(threw).toBe(true);
  return failure;
}
