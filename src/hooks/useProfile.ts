import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile, ProfileFormData } from '@/types/profile'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError) {
        setError(fetchError.message)
      } else if (data) {
        setProfile(data as Profile)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = async (formData: ProfileFormData) => {
    if (!userId) throw new Error('User not authenticated')

    // Using .upsert instead of .update guarantees it works even if the row is missing!
    const { data, error: updateError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId, // Required for upsert mapping
        full_name: formData.full_name,
        phone: formData.phone,
        occupation: formData.occupation,
        monthly_income: formData.monthly_income,
        currency: formData.currency,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }) 
      .select()
      .single()

    if (updateError) throw updateError
    setProfile(data as Profile)
    return data as Profile
  }

  return { profile, loading, error, refetchProfile: fetchProfile, updateProfile }
}