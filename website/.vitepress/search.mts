export function tokenizeForSearch(text: string): string[] {
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  const searchChunks = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|[\p{L}\p{N}@._/-]+/gu;
  const tokens = new Set<string>();
  for (const chunk of text.toLocaleLowerCase().match(searchChunks) ?? []) {
    if (!cjkPattern.test(chunk)) {
      tokens.add(chunk);
      continue;
    }

    const characters = [...chunk];
    for (const character of characters) tokens.add(character);
    for (const size of [2, 3]) {
      for (let index = 0; index + size <= characters.length; index += 1) {
        tokens.add(characters.slice(index, index + size).join(''));
      }
    }
  }
  return [...tokens];
}
