import maleNames from "./male-names.json"
import femaleNames from "./female-names.json"

// E-posta kullanıcı adları ASCII olmalı: Türkçe karakterleri katla (ç->c, ğ->g, ı->i, ö->o, ş->s, ü->u).
function foldTr(value: string): string {
  return value
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıI]/g, "i")
    .replace(/İ/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .toLowerCase()
}

const names = [...new Set([...(maleNames as string[]), ...(femaleNames as string[])].map(foldTr))].sort()

export const emailData = {
  names,
  domains: ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yandex.com"],
}
