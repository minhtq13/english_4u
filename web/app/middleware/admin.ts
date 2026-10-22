export default defineNuxtRouteMiddleware(async () => {
  const { refresh } = useProfile()
  const profile = await refresh()
  if (profile?.role !== "admin") return navigateTo("/")
})
