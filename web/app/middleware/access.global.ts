// Role-based access for every page.
//   definePageMeta({ roles: ["teacher"] }) - only those roles may open the page; admins may open everything.
//   Students without a class are sent to /join-class first (they may still open /account).
const OPEN_PATHS = ["/login", "/confirm"]

export default defineNuxtRouteMiddleware(async (to) => {
  if (OPEN_PATHS.includes(to.path)) return
  const user = useSupabaseUser()
  if (!user.value) return // the Supabase module redirects to /login
  const { refresh } = useProfile()
  const profile = await refresh()
  if (!profile) return

  if (profile.role === "student" && !profile.class_id && to.path !== "/join-class" && to.path !== "/account") {
    return navigateTo("/join-class")
  }
  const roles = to.meta.roles
  if (roles && profile.role !== "admin" && !roles.includes(profile.role)) {
    return navigateTo(homeFor(profile.role))
  }
})
