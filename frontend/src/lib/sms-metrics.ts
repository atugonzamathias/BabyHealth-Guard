const GSM_7_DEFAULT =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_7_EXTENDED = "\f^{}\\[~]|€";
export const SMS_COST_PER_SEGMENT_UGX = 25;
export const MAX_SMS_CHARACTERS = 160;
export const MAX_BASE_MESSAGE_CHARACTERS = 130;
export const MAX_STAFF_SUFFIX_CHARACTERS =
  MAX_SMS_CHARACTERS - MAX_BASE_MESSAGE_CHARACTERS;

export function smsGsm7Length(message: string): number | null {
  let length = 0;
  for (const character of message) {
    if (GSM_7_DEFAULT.includes(character)) length += 1;
    else if (GSM_7_EXTENDED.includes(character)) length += 2;
    else return null;
  }
  return length;
}

export function truncateSmsMessage(message: string, maximum = MAX_SMS_CHARACTERS): string {
  let result = "";
  let length = 0;
  for (const character of message) {
    const characterLength = GSM_7_DEFAULT.includes(character)
      ? 1
      : GSM_7_EXTENDED.includes(character)
        ? 2
        : 1;
    if (length + characterLength > maximum) break;
    result += GSM_7_DEFAULT.includes(character) || GSM_7_EXTENDED.includes(character)
      ? character
      : "?";
    length += characterLength;
  }
  return result;
}

export function smsSegmentCount(message: string): number {
  if (!message) return 0;

  let septets = 0;
  let isGsm7 = true;
  for (const character of message) {
    if (GSM_7_DEFAULT.includes(character)) {
      septets += 1;
    } else if (GSM_7_EXTENDED.includes(character)) {
      septets += 2;
    } else {
      isGsm7 = false;
      break;
    }
  }

  if (!isGsm7) {
    const characters = message.length;
    return characters <= 70 ? 1 : Math.ceil(characters / 67);
  }

  return septets <= 160 ? 1 : Math.ceil(septets / 153);
}

export function estimateSmsCost(message: string, status: string): number {
  return status === "accepted"
    ? smsSegmentCount(message) * SMS_COST_PER_SEGMENT_UGX
    : 0;
}
