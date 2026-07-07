"use client";

// /signup now just opens the global register modal and returns home.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";

export default function SignupPage() {
  const router = useRouter();
  const { openAuth } = useSession();

  useEffect(() => {
    openAuth("register");
    router.replace("/");
  }, [openAuth, router]);

  return null;
}
