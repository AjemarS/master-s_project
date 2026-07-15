"use client";

import Image from "next/image";
import { Link } from "~/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "~/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authClient, signIn } from "~/lib/auth-client";
import { GitHubIcon } from "~/ui/components/icons/github";
import { GoogleIcon } from "~/ui/components/icons/google";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/primitives/tabs";

export function SignInPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpCountdownRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const t = useTranslations("signIn");
  const tCommon = useTranslations("common");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsEmailUnverified(false);
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });
      if (result?.error) {
        if (result.error.status === 403) {
          setIsEmailUnverified(true);
          setError(t("errorEmailNotVerified"));
        } else {
          setError(result.error.message || t("errorInvalidCredentials"));
        }
        return;
      }
      router.push("/my/overview");
    } catch (err) {
      setError(t("errorGeneric"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signIn.social({ provider: "github" });
      if (result?.error) {
        setError(result.error.message || t("errorGeneric"));
      }
      // On success the page will redirect via OAuth
    } catch (err) {
      setError(t("errorGeneric"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signIn.social({ provider: "google" });
      if (result?.error) {
        setError(result.error.message || t("errorGeneric"));
      }
      // On success the page will redirect via OAuth
    } catch (err) {
      setError(t("errorGeneric"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    if (!email) return;
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/sign-in",
      });
      toast.success(t("verificationSent"));
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpEmail) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: otpEmail,
        type: "sign-in",
      });
      if (error) {
        setOtpError(error.message || t("errorGeneric"));
        return;
      }
      setOtpSent(true);
      setOtpCountdown(300);
      otpCountdownRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(otpCountdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setOtpError(t("errorGeneric"));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpSignIn = async () => {
    if (!otpEmail || !otpCode) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: otpEmail,
        otp: otpCode,
      });
      if (error) {
        setOtpError(error.message || t("errorGeneric"));
        return;
      }
      router.push("/my/overview");
    } catch {
      setOtpError(t("errorGeneric"));
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (otpCountdownRef.current) clearInterval(otpCountdownRef.current);
    };
  }, []);

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
          alt="Sign-in background image"
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

      {/* Right side - Login form */}
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

          {justRegistered && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {t("successRegistered")}
            </div>
          )}

          {/* Continue as guest */}
          <div className="text-center">
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={async () => {
                const result = await authClient.signIn.anonymous();
                if (result?.error) {
                  setError(t("errorGeneric"));
                }
                router.push("/");
              }}
            >
              {tCommon("continueAsGuest")}
            </Button>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">{t("signInButton")}</TabsTrigger>
              <TabsTrigger value="otp">{tCommon("emailCode")}</TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <Card className="border-none shadow-sm">
                <CardContent className="pt-2">
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEmailLogin(e).catch(console.error);
                    }}
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t("emailLabel")}</Label>
                      <Input
                        id="email"
                        onChange={(e) => {
                          setEmail(e.target.value);
                        }}
                        placeholder={t("emailPlaceholder")}
                        required
                        type="email"
                        value={email}
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t("passwordLabel")}</Label>
                        <Link
                          className={`
                            text-sm text-muted-foreground
                            hover:underline
                          `}
                          href="/forgot-password"
                        >
                          {t("forgotPassword")}
                        </Link>
                      </div>
                      <Input
                        id="password"
                        onChange={(e) => {
                          setPassword(e.target.value);
                        }}
                        placeholder={t("passwordPlaceholder")}
                        required
                        type="password"
                        value={password}
                      />
                    </div>
                    {error && (
                      <div className="text-sm font-medium text-destructive">{error}</div>
                    )}
                    {isEmailUnverified && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        disabled={resendingVerification}
                        onClick={handleResendVerification}
                      >
                        {resendingVerification ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        {t("resendVerification")}
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      disabled={loading}
                      type="submit"
                      aria-label="Sign in"
                    >
                      {loading ? t("signingIn") : t("signInButton")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="otp">
              <Card className="border-none shadow-sm">
                <CardContent className="pt-2">
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (otpSent) {
                        handleOtpSignIn();
                      } else {
                        handleSendOtp();
                      }
                    }}
                  >
                    {!otpSent ? (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="otp-email">{t("emailLabel")}</Label>
                          <Input
                            id="otp-email"
                            type="email"
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            placeholder={t("emailPlaceholder")}
                            required
                          />
                        </div>
                        {otpError && (
                          <div className="text-sm font-medium text-destructive">{otpError}</div>
                        )}
                        <Button
                          className="w-full"
                          disabled={otpLoading || !otpEmail}
                          type="submit"
                        >
                          {otpLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {tCommon("sendCode")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground text-center">
                          {t("otpSent", { email: otpEmail })}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="otp-code">{t("otpLabel")}</Label>
                          <Input
                            id="otp-code"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) =>
                              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                            placeholder={t("otpPlaceholder")}
                            className="text-center text-lg tracking-widest"
                            required
                            autoFocus
                          />
                        </div>
                        {otpError && (
                          <div className="text-sm font-medium text-destructive">{otpError}</div>
                        )}
                        {otpCountdown > 0 && (
                          <div className="text-xs text-center text-muted-foreground">
                            {tCommon("codeExpiresIn")}
                          </div>
                        )}
                        {otpCountdown === 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="w-full"
                            disabled={otpLoading}
                            onClick={handleSendOtp}
                            type="button"
                          >
                            {tCommon("resendCode")}
                          </Button>
                        )}
                        <Button
                          className="w-full"
                          disabled={otpLoading || otpCode.length !== 6}
                          type="submit"
                        >
                          {otpLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {t("signInWithOtp")}
                        </Button>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("orContinueWith")}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="flex items-center gap-2"
              disabled={loading}
              onClick={handleGitHubLogin}
              variant="outline"
            >
              <GitHubIcon className="h-5 w-5" />
              {t("github")}
            </Button>
            <Button
              className="flex items-center gap-2"
              disabled={loading}
              onClick={handleGoogleLogin}
              variant="outline"
            >
              <GoogleIcon className="h-5 w-5" />
              {t("google")}
            </Button>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              className={`
                text-primary underline-offset-4
                hover:underline
              `}
              href="/sign-up"
            >
              {t("signUpLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
