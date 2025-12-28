import { useState, useCallback } from 'react'

// Utility functions for WebAuthn
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Generate a random challenge
const generateChallenge = (): ArrayBuffer => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return array.buffer
}

// Check if WebAuthn is supported
export const isWebAuthnSupported = (): boolean => {
  return !!(window.PublicKeyCredential && navigator.credentials)
}

// Check if platform authenticator (biometric) is available
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

interface StoredCredential {
  credentialId: string
  walletAddress: string
  role: 'patient' | 'hospital'
  createdAt: number
}

const STORAGE_KEY = 'medichain_biometric_credentials'

// Get stored credentials
const getStoredCredentials = (): StoredCredential[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save credential
const saveCredential = (credential: StoredCredential) => {
  const credentials = getStoredCredentials()
  // Remove existing credential for same wallet
  const filtered = credentials.filter(c => c.walletAddress !== credential.walletAddress)
  filtered.push(credential)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

// Check if biometric is registered for wallet
export const isBiometricRegistered = (walletAddress: string): boolean => {
  const credentials = getStoredCredentials()
  return credentials.some(c => c.walletAddress === walletAddress)
}

// Get credential by wallet address
export const getCredentialByWallet = (walletAddress: string): StoredCredential | undefined => {
  const credentials = getStoredCredentials()
  return credentials.find(c => c.walletAddress === walletAddress)
}

export function useBiometricAuth() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Register biometric for a wallet address
  const registerBiometric = useCallback(async (
    walletAddress: string, 
    role: 'patient' | 'hospital'
  ): Promise<boolean> => {
    setIsRegistering(true)
    setError(null)

    try {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn tidak didukung di browser ini')
      }

      const available = await isPlatformAuthenticatorAvailable()
      if (!available) {
        throw new Error('Biometric tidak tersedia di perangkat ini')
      }

      const challenge = generateChallenge()
      const userId = new TextEncoder().encode(walletAddress)

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'MediChain',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: walletAddress,
          displayName: `MediChain ${role === 'patient' ? 'Patient' : 'Hospital'}`,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential

      if (!credential) {
        throw new Error('Gagal membuat credential')
      }

      // Store credential info
      saveCredential({
        credentialId: arrayBufferToBase64(credential.rawId),
        walletAddress,
        role,
        createdAt: Date.now(),
      })

      setIsRegistering(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registrasi biometric gagal'
      setError(message)
      setIsRegistering(false)
      return false
    }
  }, [])

  // Authenticate using biometric
  const authenticateBiometric = useCallback(async (
    walletAddress?: string
  ): Promise<StoredCredential | null> => {
    setIsAuthenticating(true)
    setError(null)

    try {
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn tidak didukung di browser ini')
      }

      const challenge = generateChallenge()
      
      // If wallet address provided, look for specific credential
      let allowCredentials: PublicKeyCredentialDescriptor[] | undefined
      if (walletAddress) {
        const stored = getCredentialByWallet(walletAddress)
        if (stored) {
          allowCredentials = [{
            type: 'public-key',
            id: base64ToArrayBuffer(stored.credentialId),
          }]
        }
      }

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
        allowCredentials,
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential

      if (!assertion) {
        throw new Error('Autentikasi gagal')
      }

      // Find matching credential
      const credentialId = arrayBufferToBase64(assertion.rawId)
      const credentials = getStoredCredentials()
      const matchedCredential = credentials.find(c => c.credentialId === credentialId)

      if (!matchedCredential) {
        throw new Error('Credential tidak ditemukan')
      }

      setIsAuthenticating(false)
      return matchedCredential
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Autentikasi biometric gagal'
      setError(message)
      setIsAuthenticating(false)
      return null
    }
  }, [])

  return {
    registerBiometric,
    authenticateBiometric,
    isRegistering,
    isAuthenticating,
    error,
    clearError: () => setError(null),
  }
}
