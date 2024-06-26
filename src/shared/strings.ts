
// eslint-disable-next-line no-misleading-character-class
export const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}\u{1F1E6}-\u{1F1FC}\u{1F980}-\u{1F9E0}\u{1F910}-\u{1F96B}\u{1F680}-\u{1F6FF}\u{1F100}-\u{1F64F}\u{1F0A0}-\u{1F0FF}\u{1F000}-\u{1F02F}\u{FE30}-\u{FE4F}\u{FE00}-\u{FE0F}\u{E000}-\u{F8FF}\u{A490}-\u{A4CF}\u{3000}-\u{303F}\u{2E00}-\u{2E7F}\u{2C60}-\u{2C7F}\u{2B00}-\u{2BFF}\u{2900}-\u{29FF}\u{2600}-\u{27EF}\u{2460}-\u{25FF}\u{2190}-\u{23FF}\u{20D0}-\u{214F}\u{2000}-\u{209F}\u{1E00}-\u{1EFF}\u{1DC0}-\u{1DFF}\u{0C00}-\u{0C7F}\u{0600}-\u{06FF}\u{0300}-\u{03FF}\u{0080}-\u{02AF}]+/gu

const FILTER_CHAR_CODES = [65039]

export function getEmojiFromString(value: string): string {
    const emoji = value.match(EMOJI_REGEX)

    if (emoji === null || emoji.length <= 0) {
        return ""
    }

    return emoji.filter((item) => FILTER_CHAR_CODES.indexOf(item.charCodeAt(0)) === -1).join()
}

export function parseRGBFromHex(value: string): Array<number>|null {
    const m = value.match(/^#([0-9a-f]{6})$/i);

    if (!m || !m[1]) {
        return null
    }

    return [
        parseInt(m[1].substr(0,2),16),
        parseInt(m[1].substr(2,2),16),
        parseInt(m[1].substr(4,2),16)
    ];
}
