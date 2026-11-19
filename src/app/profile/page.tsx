"use client";

import React, { useRef, useState } from "react";
import { Camera, KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { localDb } from "@/lib/data/dal";
import { notify } from "@/lib/notifications/toast-service";
import { createClient } from "@/lib/supabase/client";
import { useActiveProfile } from "@/lib/hooks/use-active-org";

const AVATAR_SIZE = 256;

/** Centre-crops the chosen image to a small square JPEG so it stays light in storage. */
function resizeToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a readable image."));
    };
    img.src = url;
  });
}

function notifyProfileChanged() {
  window.dispatchEvent(new Event("stackdrove:profile-updated"));
}

const inputCls =
  "w-full px-3.5 py-2.5 text-sm apple-input rounded-xl disabled:opacity-60 disabled:cursor-not-allowed";

export default function ProfilePage() {
  const profile = useActiveProfile();

  if (!profile) {
    return <div className="text-sm text-[#666666] dark:text-[#A3A3A3]">Sign in to view your profile.</div>;
  }
  // Remount the form if the signed-in user changes.
  return <ProfileForm key={profile.id} />;
}

function ProfileForm() {
  const profile = useActiveProfile()!;
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const initials = profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      notify.warning("Name required", { description: "Your name can't be empty." });
      return;
    }
    setSavingProfile(true);
    try {
      await localDb.updateProfile(profile.id, { full_name: fullName.trim(), phone_number: phone.trim() || null });
      notifyProfileChanged();
      notify.success("Profile updated");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify.error("Not an image", { description: "Choose a JPG, PNG or WebP picture." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify.error("Image too large", { description: "Choose a picture under 8 MB." });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeToAvatar(file);
      await localDb.updateProfile(profile.id, { avatar_url: dataUrl });
      notifyProfileChanged();
      notify.success("Profile picture updated");
    } catch (err) {
      notify.error("Could not use that picture", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    await localDb.updateProfile(profile.id, { avatar_url: null });
    notifyProfileChanged();
    notify.success("Profile picture removed");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      notify.warning("Password too short", { description: "Use at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.warning("Passwords don't match", { description: "Re-type the new password in both fields." });
      return;
    }
    setSavingPassword(true);
    try {
      const supabase = createClient();
      // Prove it's really them: re-check the current password (skipped for Google / Microsoft accounts with no password yet).
      if (currentPassword) {
        const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword });
        if (error) {
          notify.error("Current password is incorrect");
          return;
        }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        notify.error("Could not change password", { description: error.message });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify.success("Password changed", { description: "Use the new password next time you sign in." });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">My profile</h1>
        <p className="text-sm text-[#666666] dark:text-[#A3A3A3] mt-1">
          Your name, picture and sign-in password.
        </p>
      </div>

      {/* Picture + identity */}
      <section className="apple-card p-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#111111] text-white dark:bg-white dark:text-[#111111] flex items-center justify-center text-2xl font-semibold">
              {initials || <UserRound size={32} />}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[#111111] dark:text-white truncate">{profile.full_name}</p>
          <p className="text-sm text-[#666666] dark:text-[#A3A3A3] truncate">{profile.email}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/[0.05] dark:bg-white/[0.08] text-[#111111] dark:text-white">
            {profile.role.replace("_", " ")}
          </span>
          <div className="flex flex-wrap gap-2 mt-4">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="apple-btn-primary inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Camera size={14} /> {profile.avatar_url ? "Change picture" : "Upload picture"}
            </button>
            {profile.avatar_url && (
              <button
                type="button"
                onClick={removePhoto}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold border border-black/[0.1] dark:border-white/[0.14] text-[#111111] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Details */}
      <form onSubmit={saveProfile} className="apple-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Personal details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block text-xs font-semibold text-[#111111] dark:text-slate-200">
            Full name
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-semibold text-[#111111] dark:text-slate-200">
            Phone number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-semibold text-[#111111] dark:text-slate-200 sm:col-span-2">
            Email (used to sign in)
            <input value={profile.email} disabled className={`${inputCls} mt-1.5`} />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingProfile} className="apple-btn-primary px-5 h-10 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-2">
            {savingProfile && <Loader2 size={14} className="animate-spin" />} Save changes
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={changePassword} className="apple-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-[#666666]" />
          <h2 className="text-sm font-semibold text-[#111111] dark:text-white">Change password</h2>
        </div>
        <label className="block text-xs font-semibold text-[#111111] dark:text-slate-200">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`${inputCls} mt-1.5`}
          />
          <span className="block mt-1 text-[11px] font-normal text-[#666666] dark:text-[#A3A3A3]">
            Signed in with Google or Microsoft and never set a password? Leave this blank to create one.
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block text-xs font-semibold text-[#111111] dark:text-slate-200">
            New password
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-xs font-semibold text-[#111111] dark:text-slate-200">
            Confirm new password
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputCls} mt-1.5`} />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingPassword || !newPassword} className="apple-btn-primary px-5 h-10 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
            {savingPassword && <Loader2 size={14} className="animate-spin" />} Update password
          </button>
        </div>
      </form>
    </div>
  );
}
