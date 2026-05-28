"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "@tanstack/react-query";
import { Bell, BellOff, Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Avatar } from "@/components/ui/Avatar";

const profileSchema = z.object({ display_name: z.string().min(2, "Name must be at least 2 characters") });
const passwordSchema = z.object({
  old_password: z.string().min(1, "Required"),
  new_password: z.string().min(8, "Must be at least 8 characters"),
});

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription();

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: user?.display_name || "" },
  });

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { errors: pwdErrors } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (u) => { updateUser(u); toast.success("Profile updated!"); },
    onError: () => toast.error("Failed to update profile."),
  });

  const changePassword = useMutation({
    mutationFn: ({ old_password, new_password }: { old_password: string; new_password: string }) =>
      authApi.changePassword(old_password, new_password),
    onSuccess: () => { toast.success("Password changed!"); resetPwd(); },
    onError: () => toast.error("Current password is incorrect."),
  });

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>

      {/* Profile */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Profile</h2>
        <div className="flex items-center gap-4">
          <Avatar name={user.display_name} src={user.avatar_url} size="lg" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{user.display_name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <form onSubmit={handleProfile((d) => updateProfile.mutate(d))} className="space-y-4">
          <Input label="Display name" error={profileErrors.display_name?.message} {...regProfile("display_name")} />
          <Button type="submit" loading={updateProfile.isPending}>Save Changes</Button>
        </form>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Appearance</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "light", icon: Sun, label: "Light" },
            { value: "dark", icon: Moon, label: "Dark" },
            { value: "system", icon: SunMoon, label: "System" },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                theme === value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {permission !== "unsupported" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">Push Notifications</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-indigo-500" />
              ) : (
                <BellOff className="h-5 w-5 text-slate-400" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {isSubscribed ? "Notifications enabled" : "Notifications disabled"}
                </p>
                <p className="text-xs text-slate-500">
                  {permission === "denied"
                    ? "Blocked in browser settings — allow via site settings to enable."
                    : isSubscribed
                    ? "You'll receive game reminders and updates."
                    : "Enable to get game reminders on this device."}
                </p>
              </div>
            </div>
            {permission !== "denied" && (
              <Button
                variant={isSubscribed ? "outline" : "primary"}
                size="sm"
                loading={pushLoading}
                onClick={isSubscribed ? unsubscribe : subscribe}
              >
                {isSubscribed ? "Disable" : "Enable"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Password */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Change Password</h2>
        <form onSubmit={handlePwd((d) => changePassword.mutate(d))} className="space-y-4">
          <Input label="Current password" type="password" error={pwdErrors.old_password?.message} {...regPwd("old_password")} />
          <Input label="New password" type="password" error={pwdErrors.new_password?.message} {...regPwd("new_password")} />
          <Button type="submit" loading={changePassword.isPending}>Change Password</Button>
        </form>
      </div>
    </div>
  );
}
