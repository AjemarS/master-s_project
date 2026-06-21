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
  userEmail: string;
  userImage?: null | string;
  userName: string;
}

export function HeaderUserDropdown({
  isDashboard = false,
  role,
  userEmail,
  userImage,
  userName,
}: HeaderUserDropdownProps) {
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
          <Avatar className="h-8 w-8 bg-primary/10">
            <AvatarImage alt={userName || "User"} src={userImage || undefined} />
            <AvatarFallback>
              {userName ? (
                userName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
              ) : (
                <UserIcon className="h-4 w-4 text-primary" />
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
          <Link className="cursor-pointer" href="/dashboard/stats">
            <BarChart className="mr-2 h-4 w-4" />
            Stats
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" href="/dashboard/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link className="cursor-pointer" href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        {showAdmin && (
          <DropdownMenuItem asChild>
            <Link className="cursor-pointer" href="/admin/summary">
              <Shield className="mr-2 h-4 w-4" />
              {isCashier ? "POS" : isWarehouseWorker ? "Склад" : "Admin"}
            </Link>
          </DropdownMenuItem>
        )}
        {isCashier && (
          <DropdownMenuItem asChild>
            <Link className="cursor-pointer" href="/admin/pos">
              <CreditCard className="mr-2 h-4 w-4" />
              POS
            </Link>
          </DropdownMenuItem>
        )}
        {isWarehouseWorker && (
          <DropdownMenuItem asChild>
            <Link className="cursor-pointer" href="/admin/warehouses">
              <Warehouse className="mr-2 h-4 w-4" />
              Склади
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
            Log out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
