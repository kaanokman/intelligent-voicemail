"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

export function LogoutButton() {
    const router = useRouter();

    const logout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth/login");
        router.refresh();
    };

    return <Button variant='bark' onClick={logout}>Log out</Button>;
}
