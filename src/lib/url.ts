// Nur http(s)-Links erlauben, bevor ein Wert als <a href> gerendert wird -
// sonst waeren z. B. javascript:-URLs moeglich (XSS). Wird beim Speichern
// (createGift) UND nochmal beim Rendern geprueft (defense in depth) - ein
// Link koennte theoretisch auch ueber einen anderen Pfad in die Datenbank
// gelangen, ohne durch createGift validiert worden zu sein.
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
