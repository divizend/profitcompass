import { createHash } from "crypto";

export function sha256(message: string): string {
  return createHash("sha256").update(message).digest("hex");
}
