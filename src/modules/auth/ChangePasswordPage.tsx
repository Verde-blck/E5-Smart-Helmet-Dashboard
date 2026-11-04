import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { endSession } from "@/shared/lib/session";
import { changeOwnPassword, passwordChangeError, refreshSession } from "./api/auth.api";
import { AuthLayout, FormError, PasswordField, SubmitButton, authLink } from "./components/AuthLayout";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Those don’t match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose something different from your current password",
    path: ["newPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  if (user && !user.mustChangePassword) return <Navigate to="/" replace />;

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await changeOwnPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    } catch (error: unknown) {
      setFormError(passwordChangeError(error));
      return;
    }
    if (user) setUser({ ...user, mustChangePassword: false });
    await refreshSession();
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout
      title="Set your own password"
      subtitle="Your account has a temporary password. Choose your own before you continue."
      footer={
        <p>
          Not now?{" "}
          <button
            type="button"
            onClick={async () => {
              await endSession({ notifyBackend: true });
              navigate("/login", { replace: true });
            }}
            className={authLink}
          >
            Sign out
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormError message={formError} />
        <PasswordField
          label="Current password"
          registration={register("currentPassword")}
          error={errors.currentPassword?.message}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          registration={register("newPassword")}
          error={errors.newPassword?.message}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          registration={register("confirmPassword")}
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
        />
        <SubmitButton busy={isSubmitting} busyLabel="Saving…">
          Set password and continue
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
