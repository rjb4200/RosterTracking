"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.ok) {
      router.push("/staff");
      router.refresh();
      return;
    }

    setError("The username or password is incorrect.");
    setIsSubmitting(false);
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="username">Username</label>
      <input autoComplete="username" id="username" name="username" required type="text" />

      <label htmlFor="password">Password</label>
      <input autoComplete="current-password" id="password" name="password" required type="password" />

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
