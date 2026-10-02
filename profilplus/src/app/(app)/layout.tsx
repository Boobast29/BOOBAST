import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-profil-light dark:bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl animate-fade-in p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
