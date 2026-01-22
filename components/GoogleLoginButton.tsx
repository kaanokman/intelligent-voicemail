"use client";

import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export default function GoogleLoginButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const divRef = useRef(null);

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

      // refresh first so server components update, then navigate
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Error logging in with Google", err);
    }
  };

  return (
    <>
      <GoogleLogin
        onSuccess={(credentialResponse) => { void handleSignInWithGoogle(credentialResponse); }}
        onError={() => {
          console.log('Login Failed');
        }}
      />
    </>
  );
}
