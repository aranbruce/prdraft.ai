"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/auth-form";
import { LogoGoogle } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

import { loginWithProvider, register, RegisterActionState } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    },
  );

  useEffect(() => {
    if (state.status === "user_exists") {
      toast.error("Account already exists");
    } else if (state.status === "failed") {
      toast.error("Failed to create account");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status === "success") {
      toast.success("Account created successfully");
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  const handleLoginWithProvider = (provider: string) => {
    loginWithProvider(provider);
  };

  return (
    <div className="bg-background flex h-dvh w-screen flex-col items-center justify-center pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-4 px-4 sm:px-16">
        <div className="flex flex-col items-stretch justify-center gap-4 text-center">
          <div className="flex flex-col items-stretch justify-center gap-2 text-center">
            <h3 className="text-primary text-xl font-semibold">Sign Up</h3>
            <p className="text-secondary-foreground text-sm">
              Create an account with your email and password
            </p>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-3 text-center">
            <Button
              variant="default"
              onClick={() => handleLoginWithProvider("google")}
            >
              <LogoGoogle />
              Sign up with Google
            </Button>
            <Button
              variant="default"
              onClick={() => handleLoginWithProvider("github")}
            >
              Sign up with GitHub
            </Button>
          </div>
        </div>
        <p className="text-secondary-foreground text-center text-sm">Or</p>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
          <p className="text-secondary-foreground mt-4 text-center text-sm">
            {"Already have an account? "}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-semibold"
            >
              Log in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
