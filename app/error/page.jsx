import { redirect } from "next/navigation";

export default function AuthErrorFallback({ searchParams }) {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  redirect(queryString ? `/auth/signin?${queryString}` : "/auth/signin");
}
