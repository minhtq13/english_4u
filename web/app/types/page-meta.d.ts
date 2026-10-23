import type { Enums } from "./database.types"

declare module "#app" {
  interface PageMeta {
    /** Roles allowed to open the page (admins always can). Omit for every signed-in person. */
    roles?: Enums<"app_role">[]
  }
}

export {}
