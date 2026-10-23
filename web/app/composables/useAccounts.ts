import type { Enums } from "~/types/database.types"

export interface NewAccount { username: string; password: string; full_name: string }
export interface CreateResult { ok: boolean; id?: string; username: string; full_name: string; password?: string; error?: string }

/** Calls the manage-accounts edge function; every call returns an error message or null. */
export function useAccounts() {
  const client = useSupabaseClient()

  async function call<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
    const { data, error } = await client.functions.invoke("manage-accounts", { body })
    if (!error) return { data: data as T, error: null }
    // HTTP errors carry the function's response; its { error } is the Vietnamese message to show.
    const res = (error as { context?: Response }).context
    if (res && typeof res.json === "function") {
      const payload = await res.json().catch(() => null)
      return { data: null, error: errorText(payload?.error ?? error.message) }
    }
    return { data: null, error: errorText(error.message) }
  }

  return {
    create: (accounts: NewAccount[], role: Enums<"app_role">, classId: string | null) =>
      call<{ results: CreateResult[] }>({ action: "create", accounts, role, class_id: classId }),
    setPassword: (userId: string, password: string) => call({ action: "set_password", user_id: userId, password }),
    update: (userId: string, patch: { full_name?: string; username?: string }) => call({ action: "update", user_id: userId, ...patch }),
    setActive: (userId: string, active: boolean) => call({ action: "set_active", user_id: userId, active }),
    remove: (userId: string) => call({ action: "delete", user_id: userId }),
  }
}
