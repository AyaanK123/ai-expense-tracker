import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from '@/components/auth/AuthForm'

export function RegisterPage() {
  const { signUp } = useAuth()

  return <AuthForm mode="register" onSubmit={signUp} />
}
