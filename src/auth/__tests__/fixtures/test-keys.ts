/**
 * Test RSA key pair for JWT testing
 * Generated with:
 * openssl genrsa -out private.pem 2048
 * openssl rsa -in private.pem -pubout -out public.pem
 * Then converted from PKCS#1 to PKCS#8 format for jsonwebtoken compatibility:
 * openssl pkcs8 -topk8 -nocrypt -in private.pem -out private_pkcs8.pem
 */

export const TEST_RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCYBL/tpH8wKOn8
HLE716N9BEzjMk7Wv/7FF5dj5tgBP+vIDpb6HtvCwzHS5YQGIg73oAAZp9YvIDF4
4bNlH7WVsk0TKI+ISbRFrAISDuplgpcl42kvGKuAZ5aFj2wlQQajAi/CGjUUXO2K
U801MNM7M8gj89l0ayY5O9l86gEbVuXlRDb6SIPPLYq2uwqU1n/BJMOdh7iQO5QM
sVysk4yALAAJTiXbwlLvuzGRPBaOAcAy4YDsPhnDYHBCupAL01tvkOZP0HFEB+15
Z+Ai/VwBYdrceLgg2x5RFMxdfAN3hjJ3rbQV17EHbFWGPrvD+EbqUsDAIwNfmtlk
purP25HfAgMBAAECggEADw1u8oYc+ltRKlLhZJZwsuXUnGCN+ISwiO24YouBxinn
dZRzdAo1ld6D4sKYMcISLyHRylImPd29sevQIPC+J1FggWE9FfBaYDwgEY98u5cH
n8uAGrCiKe4+TZsXr16pD6xqDZm27MonOTdQDl0qmH+czzaLlZP9VNVHLuLxP7aF
d+mBKjunJOyqPYAX5VSyxEff0uxY4mLrHp8BVi9NC/qEzV3Y+ztOZLeGMwP74x4f
Uk8SMqIGcaWoVR2H8UUCp0lLhNnph3Abm+aQUY6Tw4C96wVar1wlilTmV+QLVk0M
EBbz/03RYmOhQ0JRggOxowTl7uyM5QAhlu6ClnTRlQKBgQDKri1o5zMZN+MTrDus
ItHM51wRKDFIEuqJOslCWEg6iIsiS8cHYDfRhC2a0fzthcvjbWZTB27MNYvgiA2O
kqeNq3YSlD5cygfPVZ4BjqM75IwoI7qXK8TwyL3QpMs+vTmwU3l+TGoPmSU+bO/R
1FI84y1tCJHG/+os0j/DwYZ+QwKBgQDAAqxsGZ+qDu3e0oNqpm5nYGx2v2K3P7VF
gerx49JyDGlpphW9OXapU44i9gbrv0OLv6mjhTb3KBoIbRqH/goAouj3cc5+apcK
wACBnqgMoRjZLLKnEs6ChQU+qu9XncoO2UDLhvaJauRxz0IcG1W/2bPWIuwLRdqF
yFilbRL6NQKBgEigeW0py8mxmREnmopoP72o+fi76kzlWl2qTwwTDm7LFvBHLx6Z
f+b38k+UB4olc5YfUZdXBoDufx0KI7F/I8NEOZ8Wt/IQAxRsnZ35OszvbLnFc8tP
x9ZwWHQ3WQ02SUHB57s2LptASXRBHP6XkpB254Q2meYxNfyxql+/LS55AoGAVTga
jLPmsFSF8JJgL1KEx679FMsmpgxJiPr7arZhraqiknhbR6ucZdSmzg+BzNoLwZek
U+YJGjMbMsgxsU/n4pZrbX9+VY87UFMdJmpjTY+mdqUm+Y4YR8eAJ2s4ZRusFWEJ
KAvTmfPuRjDlt5HOQiL+dTj0qKAtN5lO9sTtWk0CgYBNiqAYponbc4epYmPtXIJr
PCriItnq7sRIdHDJs2Lvzf+UgC9GEyhtMmp3Qn8dAGKIHPwS7wBijP+9Lk/CLaMP
NYKM+x+WfkCrVigVj70LLyqzUuQUncEVuiucOfWfFL5I4PRBWEIpZqkrX0n4fQxO
hZEzcHSabuYQrHNu4WJy0g==
-----END PRIVATE KEY-----`;

export const TEST_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmAS/7aR/MCjp/ByxO9ej
fQRM4zJO1r/+xReXY+bYAT/ryA6W+h7bwsMx0uWEBiIO96AAGafWLyAxeOGzZR+1
lbJNEyiPiEm0RawCEg7qZYKXJeNpLxirgGeWhY9sJUEGowIvwho1FFztilPNNTDT
OzPII/PZdGsmOTvZfOoBG1bl5UQ2+kiDzy2KtrsKlNZ/wSTDnYe4kDuUDLFcrJOM
gCwACU4l28JS77sxkTwWjgHAMuGA7D4Zw2BwQrqQC9Nbb5DmT9BxRAfteWfgIv1c
AWHa3Hi4INseURTMXXwDd4Yyd620FdexB2xVhj67w/hG6lLAwCMDX5rZZKbqz9uR
3wIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Test issuer and audience values
 */
export const TEST_ISSUER = 'https://auth.example.com';
export const TEST_AUDIENCE = 'https://mcp.example.com';

/**
 * Helper to create a valid test token with custom claims
 */
import jwt from 'jsonwebtoken';

export function createTestToken(
  claims: Record<string, unknown> = {},
  privateKey: string = TEST_RSA_PRIVATE_KEY
): string {
  const now = Math.floor(Date.now() / 1000);

  const defaultClaims = {
    sub: 'test-user-123',
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    iat: now,
    exp: now + 3600, // 1 hour from now
    scope: 'sonarqube:read',
  };

  return jwt.sign({ ...defaultClaims, ...claims }, privateKey, { algorithm: 'RS256' });
}
