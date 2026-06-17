"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  user_id: string;
  initial_setup_completed: boolean;
};

export function AuthGate({
  children,
  requireSetup = true,
}: {
  children: (user: User) => React.ReactNode;
  requireSetup?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id,user_id,initial_setup_completed")
        .eq("user_id", currentUser.id)
        .maybeSingle<Profile>();

      if (requireSetup && !profile?.initial_setup_completed) {
        router.replace("/setup");
        return;
      }

      if (pathname === "/setup" && profile?.initial_setup_completed) {
        router.replace("/home");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    }

    load();
  }, [pathname, requireSetup, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6faf5] px-6 text-center text-xl font-bold text-green-900">
        読み込み中です
      </div>
    );
  }

  return user ? children(user) : null;
}
