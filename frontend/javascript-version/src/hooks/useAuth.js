'use client'

import { useSession, signOut } from 'next-auth/react'

/**
 * Custom hook for authentication
 * Provides session data and helper functions
 */
export function useAuth() {
    const { data: session, status, update } = useSession()

    const isAuthenticated = status === 'authenticated'
    const isLoading = status === 'loading'
    const isUnauthenticated = status === 'unauthenticated'

    const user = session?.user || null
    const accessToken = session?.accessToken || null

    const logout = async (callbackUrl = '/login') => {
        await signOut({ callbackUrl })
    }

    const updateSession = async (data) => {
        await update(data)
    }

    return {
        session,
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        isUnauthenticated,
        status,
        logout,
        updateSession
    }
}

export default useAuth
