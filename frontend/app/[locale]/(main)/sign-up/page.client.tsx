"use client";

import Image from "next/image";
import { Link } from "~/i18n/navigation";
import { useRouter } from "~/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { signIn, signUp } from "~/lib/auth-client";
import { GitHubIcon } from "~/ui/components/icons/github";
import { GoogleIcon } from "~/ui/components/icons/google";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";

export function SignUpPageClient() {
  const t = useTranslations("signUp");
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const { error: signUpError } = await signUp.email({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      if (signUpError) {
        setError(t("errorGeneric"));
        return;
      }
      router.push("/sign-in?registered=true");
    } catch (err) {
      setError(t("errorGeneric"));
      console.error(err);
    } finally {
      setLoading(false);
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
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("nameLabel")}</Label>
                  <Input
                    id="name"
                    name="name"
                    onChange={handleChange}
                    placeholder={t("namePlaceholder")}
                    required
                    type="text"
                    value={formData.name}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
                  <Input
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
                    id="password"
                    name="password"
                    onChange={handleChange}
                    placeholder={t("passwordPlaceholder")}
                    required
                    type="password"
                    value={formData.password}
                  />
                </div>
                {error && <div className="text-sm font-medium text-destructive">{error}</div>}
                <Button className="w-full" disabled={loading} type="submit">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
