'use client'
import { useEffect, useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'

export default function AuthForm() {
  const supabase = createClient()
  // const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined)

  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     setRedirectTo(`${window.location.origin}/auth/callback`)
  //   }
  // }, [])

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-lg mb-6">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248h5.513V8.855l3.371 7.637h3.105l3.447-7.637v13.769H21V1.376h-8.884l-1.616 3.743L8.884 1.376z" />
          </svg>
        </div>
        <h1 className="text-3xl font-light text-white mb-2">Sign in to your account</h1>
        <p className="text-gray-400 text-sm">Welcome back. We missed you.</p>
      </div>

      {/* Auth Form */}
      <div className="bg-white rounded-lg shadow-2xl p-8 sm:p-10">
        <Auth
          supabaseClient={supabase}
          view="sign_in"
          showLinks={true}
          providers={[]}
          redirectTo={`${location.origin}/auth/callback`}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#dc2626',
                  brandAccent: '#b91c1c',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#f8fafc',
                  defaultButtonBackgroundHover: '#f1f5f9',
                  inputBackground: 'white',
                  inputBorder: '#e2e8f0',
                  inputBorderHover: '#dc2626',
                  inputBorderFocus: '#dc2626',
                  inputText: '#1e293b',
                  inputLabelText: '#374151',
                  inputPlaceholder: '#9ca3af',
                },
              },
            },
            className: {
              container: 'space-y-6',
              button: 'transition-all duration-200 hover:shadow-lg font-medium tracking-wide',
              input: 'transition-all duration-200 font-normal',
              label: 'font-medium text-gray-700',
              anchor: 'text-red-600 hover:text-red-700 font-medium',
              divider: 'text-gray-400',
              message: 'text-sm',
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Password',
                button_label: 'Continue',
                social_provider_text: 'Continue with {{provider}}',
                link_text: "Don't have an account? Sign up",
              },
              sign_up: {
                email_label: 'Email address',
                password_label: 'Create password',
                button_label: 'Create account',
                social_provider_text: 'Continue with {{provider}}',
                link_text: 'Already have an account? Sign in',
              },
            },
          }}
        />


        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-red-600 hover:text-red-700">Terms of Use</a>{' '}
            and{' '}
            <a href="#" className="text-red-600 hover:text-red-700">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
