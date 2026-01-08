import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full d-flex align-items-center justify-content-between px-5 bg-primary h-20">
        <div style={{ width: 144, height: 40 }}>
          <img width="144" height="40" src="https://proda.ai/wp-content/uploads/2023/09/PRODA-logo-light-blue-288x80.png" alt="PRODA logo"></img>
        </div>
        <div className="w-full flex justify-end items-center text-sm">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>
      <div className='flex-1 d-flex flex-row gap-2'>
        <div className="d-flex flex-column bg-light border-end p-2"
          style={{ width: "220px", minWidth: "220px" }}>
          <Sidebar />
        </div>
        <div className="flex-col flex-1 gap-3 p-3 me-2">
          {children}
        </div>
      </div>
    </main>
  );
}
