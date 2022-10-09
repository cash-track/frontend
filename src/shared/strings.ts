
export const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}\u{1F1E6}-\u{1F1FC}]+/gu

export function getEmojiFromString(value: string) {
    return value.match(EMOJI_REGEX)
}