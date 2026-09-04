import passwords from "./passwords.json"
import { isMixedPassword } from "../password-data"

export const passwordData = {
  // EN küratörlü havuz: İngilizce leet + yaygın şifreler (ham).
  passwords: passwords as string[],
  // Üretimde kullanılan havuz: yalnızca harf+rakam karışık EN şifreler.
  mixed: (passwords as string[]).filter(isMixedPassword),
}
