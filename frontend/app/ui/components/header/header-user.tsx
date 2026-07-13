import { useTranslations } from "next-intl";
import { BarChart, LogOut, Settings, Shield, UserIcon, CreditCard, Warehouse } from "lucide-react";
import Link from "next/link";

import { cn } from "~/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/primitives/avatar";
import { Button } from "~/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/primitives/dropdown-menu";

interface HeaderUserDropdownProps {
  isDashboard: boolean;
  role: string;
  userEmail: string | null | undefined;
  userImage?: null | string;
  userName: string | null | undefined;
}

export function HeaderUserDropdown({
  isDashboard = false,
  role,
  userEmail,
  userImage,
  userName,
}: HeaderUserDropdownProps) {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const isAdmin = role === "admin";
  const isCashier = role === "cashier";
  const isWarehouseWorker = role === "warehouse_worker";
  const showAdmin = isAdmin || isCashier || isWarehouseWorker;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="relative overflow-hidden rounded-full" size="icon" variant="ghost">
          <Avatar className="h-9 w-9">
            <AvatarImage alt={userName || "User"} src={userImage || undefined} />
            <AvatarFallback>
              {userName ? (
                userName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <Avatar className="h-8 w-8 bg-accent-electric/10">
            <AvatarImage alt={userName || "User"} src={userImage || undefined} />
            <AvatarFallback>
              {userName ? (
                userName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
              ) : (
                <UserIcon className="h-4 w-4 text-accent-electric" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{userName || "User"}</p>
            <p className={"max-w-40 truncate text-xs text-muted-foreground"}>{userEmail}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" href="/my/overview">
            <BarChart className="mr-2 h-4 w-4" />
            {tNav("overview")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" href="/my/settings">
            <Settings className="mr-2 h-4 w-4" />
            {tNav("settings")}
          </Link>
        </DropdownMenuItem>
        {showAdmin && (
          <DropdownMenuItem asChild>
            <Link className="cursor-pointer" href="/admin/summary">
              <Shield className="mr-2 h-4 w-4" />
              {isCashier ? tCommon("pos") : isWarehouseWorker ? tCommon("warehouse") : tCommon("admin")}
            </Link>
          </DropdownMenuItem>
        )}
        {isCashier && (
          <DropdownMenuItem asChild>
            <Link className="cursor-pointer" href="/admin/pos">
              <CreditCard className="mr-2 h-4 w-4" />
              {tCommon("pos")}
            </Link>
          </DropdownMenuItem>
        )}
        {isWarehouseWorker && (
          <DropdownMenuItem asChild>
            <Link className="cursor-pointer" href="/admin/warehouses">
              <Warehouse className="mr-2 h-4 w-4" />
              {tNav("warehouses")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className={cn(
            "cursor-pointer",
            isDashboard
              ? "text-red-600"
              : `
                text-destructive
                focus:text-destructive
              `
          )}
        >
          <Link href="/sign-out">
            <LogOut className="mr-2 h-4 w-4" />
            {tCommon("signOut")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
