'use client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'

export default function AuthForm() {
  const supabase = createClient()

  return (
    <div className="backdrop-blur-sm bg-white/70 border border-white/20 rounded-3xl p-8 shadow-2xl">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#6366f1',
                brandAccent: '#4f46e5',
                brandButtonText: 'white',
                defaultButtonBackground: '#f8fafc',
                defaultButtonBackgroundHover: '#f1f5f9',
                inputBackground: 'rgba(255, 255, 255, 0.8)',
                inputBorder: 'rgba(203, 213, 225, 0.5)',
                inputBorderHover: '#6366f1',
                inputBorderFocus: '#6366f1',
              },
              borderWidths: {
                buttonBorderWidth: '1px',
                inputBorderWidth: '1px',
              },
              radii: {
                borderRadiusButton: '12px',
                buttonBorderRadius: '12px',
                inputBorderRadius: '12px',
              },
            },
          },
          className: {
            container: 'space-y-4',
            button: 'transition-all duration-200 hover:scale-[1.02] font-medium',
            input: 'transition-all duration-200 backdrop-blur-sm',
          },
        }}
        view="sign_in"
        showLinks={true}
        providers={['github', 'google']}
        redirectTo={`${location.origin}/auth/callback`}
      />
    </div>
  )
}
