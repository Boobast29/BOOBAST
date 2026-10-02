export { default } from "next-auth/middleware";

// Protege les routes applicatives (RBAC + JWT via NextAuth)
export const config = {
  matcher: [
    "/tickets/:path*",
    "/board/:path*",
    "/knowledge/:path*",
    "/cases/:path*",
    "/search/:path*",
    "/equipment/:path*",
    "/alerts/:path*",
    "/stats/:path*",
    "/admin/:path*",
  ],
};
