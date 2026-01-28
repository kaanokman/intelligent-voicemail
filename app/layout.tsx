import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import "react-toastify/dist/ReactToastify.css";
import './custom.scss';
import "./globals.css";
import { GoogleOAuthProvider } from '@react-oauth/google';

import HeidiLogo from "@/components/heidi-logo";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),
    title: "Next.js and Supabase Starter Kit",
    description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
    variable: "--font-geist-sans",
    display: "swap",
    subsets: ["latin"],
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter", // optional but recommended
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.className} antialiased bg-light`}>
                <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="light"
                        enableSystem={false}
                        disableTransitionOnChange
                    >
                        <main className="min-h-screen flex">
                            <nav className="w-full flex items-center justify-between
                                px-5 h-20 bg-sunlight position-fixed z-2">
                                <HeidiLogo color='#28030f' />
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
                            <div style={{ paddingTop: 80 }} className="flex-1">
                                {children}
                            </div>
                        </main>
                    </ThemeProvider>
                </GoogleOAuthProvider>
                <ToastContainer position="bottom-right" />
            </body>
        </html>
    );
}
