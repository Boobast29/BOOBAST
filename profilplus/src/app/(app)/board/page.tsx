import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban-board";

export default async function BoardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "TECHNICIEN" && role !== "ADMIN") redirect("/tickets");

  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attachments: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Kanban support</h1>
      <p className="mt-1 text-sm text-muted-foreground">Glissez-déposez les tickets entre les colonnes.</p>
      <div className="mt-6">
        <KanbanBoard initial={JSON.parse(JSON.stringify(tickets))} />
      </div>
    </div>
  );
}
