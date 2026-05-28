"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { groupsApi } from "@/lib/api/groups";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronRight, Plus, Users } from "lucide-react";
import Link from "next/link";

const container = { animate: { transition: { staggerChildren: 0.06 } } };
const item = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function GroupsPage() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Groups</h1>
        <Link href="/groups/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            New Group
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : groups?.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No groups yet"
          description="Create your first group to start organising games with your team."
          action={
            <Link href="/groups/new">
              <Button><Plus className="w-4 h-4" /> Create a Group</Button>
            </Link>
          }
        />
      ) : (
        <motion.div variants={container} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => (
            <motion.div key={group.id} variants={item}>
              <Link href={`/groups/${group.id}`}>
                <Card hover className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{group.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-slate-500">
                          <strong className="text-slate-700 dark:text-slate-300">{group.member_count}</strong> members
                        </span>
                        {group.my_role === "admin" && (
                          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
