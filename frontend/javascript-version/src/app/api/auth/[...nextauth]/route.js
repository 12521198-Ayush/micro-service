import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import { loginUser, getProfile } from '@/libs/auth-service'

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        throw new Error('Email and password are required')
                    }

                    // Call the login API
                    const response = await loginUser({
                        email: credentials.email,
                        password: credentials.password
                    })

                    if (response.token && response.user) {
                        // Return user object with token
                        return {
                            id: response.user.id,
                            email: response.user.email,
                            name: response.user.name,
                            accessToken: response.token
                        }
                    }

                    return null
                } catch (error) {
                    console.error('Login error:', error)
                    throw new Error(error.message || 'Invalid credentials')
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id
                token.email = user.email
                token.name = user.name
                token.accessToken = user.accessToken
            }

            // Handle token update (e.g., after profile update)
            if (trigger === 'update' && session?.accessToken) {
                token.accessToken = session.accessToken
                if (session.name) token.name = session.name
                if (session.email) token.email = session.email
            }

            return token
        },
        async session({ session, token }) {
            // Send properties to the client
            if (token) {
                session.user.id = token.id
                session.user.email = token.email
                session.user.name = token.name
                session.accessToken = token.accessToken
            }

            return session
        }
    },
    pages: {
        signIn: '/login',
        error: '/login'
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60 // 24 hours (matching API token expiry)
    },
    secret: process.env.NEXTAUTH_SECRET
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
