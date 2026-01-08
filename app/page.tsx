import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import DashboardButton from "@/components/dashboard-button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-white">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
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
        <div className="flex-1 d-flex align-items-center gap-0 max-w-5xl p-5">
          <main className="flex flex-col gap-6 px-4">
            <div className="text-3xl font-semibold text-primary">
              Kaan's Proda Project
            </div>
            <DashboardButton />
          </main>
        </div>
        <footer className="w-full flex items-center justify-center bg-primary mx-auto text-center text-xs gap-8 py-16">
        </footer>
      </div>
    </main>
  );
}
