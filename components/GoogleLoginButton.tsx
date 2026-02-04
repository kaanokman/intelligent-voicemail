"use client";

import { createClient } from "@/lib/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Spinner } from "react-bootstrap";

export default function GoogleLoginButton() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [ready, setReady] = useState(false);

    useEffect(() => {
        // GoogleLogin renders after script loads
        const t = setTimeout(() => setReady(true), 300);
        return () => clearTimeout(t);
    }, []);

    const handleSignInWithGoogle = async (credentialResponse: CredentialResponse) => {
        try {
            if (!credentialResponse.credential) {
                throw new Error('Google credentials missing');
            }

            const { error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: credentialResponse.credential,
            });
            if (error) throw error;

            // Refresh first so server components update, then navigate
            router.replace("/dashboard");
            router.refresh();
        } catch (err) {
            console.error("Error logging in with Google", err);
        }
    };

    return (ready ?
        <div className='google-login-wrapper'>
            <GoogleLogin
                width={'100%'}
                onSuccess={(credentialResponse) => { void handleSignInWithGoogle(credentialResponse); }}
                onError={() => {
                    console.log('Login Failed');
                }}
            />
        </div> :
        <div className='flex justify-center items-center border' style={{ height: 40, minHeight: 40 }}>
            <Spinner size='sm' />
        </div>
    );
}
