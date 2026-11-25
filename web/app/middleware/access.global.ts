// Role-based access for every page.
//   definePageMeta({ roles: ["teacher"] }) - only those roles may open the page; admins may open everything.
//   Students without a class are sent to /join-class first (they may still open /account).
//   "/" is the public landing page (prerendered); someone signed in goes on to their own home.
const OPEN_PATHS = ["/login", "/confirm"]

export default defineNuxtRouteMiddleware(async (to) => {
  if (OPEN_PATHS.includes(to.path)) return
  // The landing page is prerendered on the server, where there is no session to look at.
  if (import.meta.server) return
  const user = useSupabaseUser()
  if (!user.value) return // the Supabase module redirects to /login (except from the landing page, which is public)
  const { refresh } = useProfile()
  const profile = await refresh()
  if (!profile) return

  if (to.path === "/") return navigateTo(homeFor(profile.role))
  if (profile.role === "student" && !profile.class_id && to.path !== "/join-class" && to.path !== "/account") {
    return navigateTo("/join-class")
  }
  const roles = to.meta.roles
  if (roles && profile.role !== "admin" && !roles.includes(profile.role)) {
    return navigateTo(homeFor(profile.role))
  }
})
