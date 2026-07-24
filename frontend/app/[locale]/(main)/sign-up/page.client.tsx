"use client";

import Image from "next/image";
import { Link } from "~/i18n/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { signIn, signUp, authClient } from "~/lib/auth-client";
import { GitHubIcon } from "~/ui/components/icons/github";
import { InputOTP, InputOTPSlot } from "~/ui/primitives/input-otp";
import { GoogleIcon } from "~/ui/components/icons/google";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";
import { Checkbox } from "~/ui/primitives/checkbox";

export function SignUpPageClient() {
  const locale = useLocale();
  const t = useTranslations("signUp");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    repeatPassword: "",
    marketingConsent: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  type Step = "form" | "otp" | "complete";
  const [step, setStep] = useState<Step>("form");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.repeatPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await signUp.email({
        name: formData.email,
        email: formData.email,
        password: formData.password,
        marketing_consent: formData.marketingConsent,
        locale,
      });
      if (signUpError) {
        const code = typeof signUpError === 'object' && signUpError !== null && 'code' in signUpError
          ? (signUpError as { code: string }).code
          : null;
        const errorMap: Record<string, string> = {
          weak_password: t("errorPasswordLength"),
          user_already_exists: t("emailExists"),
          invalid_email: t("invalidEmail"),
        };
        setError(code && errorMap[code] ? errorMap[code] : t("errorGeneric"));
        return;
      }
      setStep("otp");
    } catch (err) {
      setError(t("errorGeneric"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setVerifying(true);
    setError("");
    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: formData.email,
        otp: otpCode,
      });
      if (verifyError) {
        setError(t("invalidOtp"));
        return;
      }
      setStep("complete");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: formData.email,
        type: "email-verification",
      });
    } catch {
      setError(t("errorGeneric"));
    }
  };

  const handleGitHubSignUp = async () => {
    setError("");
    try {
      const result = await signIn.social({ provider: "github", callbackURL: "/sign-in?registered=true" });
      if (result?.error) {
        setError(t("errorGeneric"));
      }
    } catch {
      setError(t("errorGeneric"));
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/sign-in?registered=true" });
      if (result?.error) {
        setError(t("errorGeneric"));
      }
    } catch {
      setError(t("errorGeneric"));
    }
  };

  return (
    <div
      className={`
        grid h-screen 
        md:grid-cols-2
      `}
    >
      {/* Left side - Image */}
      <div
        className={`
          relative hidden
          md:block
        `}
      >
        <Image
          alt="Sign-up background image"
          className="object-cover"
          fill
          priority
          sizes="(max-width: 768px) 0vw, 50vw"
          src="https://images.unsplash.com/photo-1719811059181-09032aef07b8?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3"
        />
        <div
          className={`
            absolute inset-0 bg-linear-to-t from-background/80 to-transparent
          `}
        />
        <div className="absolute bottom-8 left-8 z-10 text-white">
          <h1 aria-hidden="true" className=" text-3xl font-bold">{t("pageTitle")}</h1>
          <p className="mt-2 max-w-md text-sm text-white/80">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* Right side - Sign up form */}
      <div
        className={`
          flex items-center justify-center p-4
          md:p-8
        `}
      >
        <div className="w-full max-w-md space-y-4">
          <div
            className={`
              space-y-4 text-center
              md:text-left
            `}
          >
            <h2 className=" text-3xl font-bold">{t("pageTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("pageSubtitle")}
            </p>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="pt-2">
              {step === "complete" ? (
                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/10 dark:border-primary/30 dark:bg-primary/15 p-6 text-center">
                  <div className="text-4xl">🎉</div>
                  <h3 className="text-lg font-semibold">{t("successTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("successMessage")}</p>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button asChild variant="default" className="w-full">
                      <Link href="/my/settings">{t("goToSettings")}</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/">{t("continueShopping")}</Link>
                    </Button>
                  </div>
                </div>
              ) : step === "otp" ? (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{t("verifyEmailTitle")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.rich("verifyEmailMessage", { email: formData.email })}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      onChange={(val) => setOtpCode(val)}
                      value={otpCode}
                    >
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTP>
                  </div>

                  {error && <div className="text-sm font-medium text-destructive">{error}</div>}

                  <Button
                    className="w-full"
                    disabled={verifying || otpCode.length !== 6}
                    onClick={handleVerifyOtp}
                  >
                    {verifying ? t("verifying") : t("verifyButton")}
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {t("notReceivedCode")}{" "}
                    <button
                      className="text-primary underline-offset-4 hover:underline cursor-pointer"
                      onClick={handleResendOtp}
                      type="button"
                    >
                      {t("resendOtp")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t("emailLabel")}</Label>
                      <Input
                        autoComplete="email"
                        id="email"
                        name="email"
                        onChange={handleChange}
                        placeholder={t("emailPlaceholder")}
                        required
                        type="email"
                        value={formData.email}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">{t("passwordLabel")}</Label>
                      <Input
                        autoComplete="new-password"
                        id="password"
                        name="password"
                        onChange={handleChange}
                        placeholder={t("passwordPlaceholder")}
                        required
                        type="password"
                        value={formData.password}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeatPassword">{t("repeatPasswordLabel")}</Label>
                      <Input
                        autoComplete="new-password"
                        id="repeatPassword"
                        name="repeatPassword"
                        onChange={handleChange}
                        placeholder={t("repeatPasswordPlaceholder")}
                        required
                        type="password"
                        value={formData.repeatPassword}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="marketingConsent"
                        checked={formData.marketingConsent}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, marketingConsent: checked === true }))}
                      />
                      <Label htmlFor="marketingConsent" className="text-sm text-muted-foreground cursor-pointer">
                        {t("marketingConsent")}
                      </Label>
                    </div>
                    {error && <div className="text-sm font-medium text-destructive">{error}</div>}
                    <Button className="w-full" disabled={loading || !formData.email || !formData.password || !formData.repeatPassword || formData.password !== formData.repeatPassword} type="submit">
                      {loading ? t("signingUp") : t("signUpButton")}
                    </Button>
                  </form>
                  <div className="relative mt-6">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">{t("orContinueWith")}</span>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <Button
                      className="flex items-center gap-2"
                      disabled={loading}
                      onClick={handleGitHubSignUp}
                      variant="outline"
                    >
                      <GitHubIcon className="h-5 w-5" />
                      {t("github")}
                    </Button>
                    <Button
                      className="flex items-center gap-2"
                      disabled={loading}
                      onClick={handleGoogleSignUp}
                      variant="outline"
                    >
                      <GoogleIcon className="h-5 w-5" />
                      {t("google")}
                    </Button>
                  </div>
                  <div className="mt-6 text-center text-sm text-muted-foreground">
                    {t("hasAccount")}{" "}
                    <Link
                      className={`
                        text-primary underline-offset-4
                        hover:underline
                      `}
                      href="/sign-in"
                    >
                      {t("signInLink")}
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
