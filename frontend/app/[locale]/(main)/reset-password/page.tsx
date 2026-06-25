"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/ui/primitives/card";
import { CheckCircle, Lock } from "lucide-react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result?.error) {
        setError(result.error.message || "Failed to reset password");
      } else {
        setDone(true);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>This password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full"><Link href="/forgot-password">Request new link</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <CardTitle>Password reset</CardTitle>
          <CardDescription>Your password has been updated.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full"><Link href="/sign-in">Sign in</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Lock className="h-10 w-10 mb-2 text-purple-600" />
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter your new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rp-password">New password</Label>
            <Input id="rp-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <Label htmlFor="rp-confirm">Confirm password</Label>
            <Input id="rp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
