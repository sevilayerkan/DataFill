import passwords from "./passwords.json"
import { isMixedPassword } from "../password-data"

export const passwordData = {
  // TR küratörlü havuz: Türkçe leet şifreler (ham).
  passwords: passwords as string[],
  // Üretimde kullanılan havuz: yalnızca harf+rakam karışık TR şifreler.
  mixed: (passwords as string[]).filter(isMixedPassword),
}
