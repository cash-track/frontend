import { apiCall } from '../client'

export interface EmailConfirmation {
    email: string
    createdAt: Date
    resendTimeLimit: number
    validTimeLimit: number
    timeSentAgo: number
    isThrottled: boolean
    isValid: boolean
}

export async function getEmailConfirmation(): Promise<EmailConfirmation> {
    return apiCall(async client => {
        const res = await client.get('/api/auth/email/confirmation')
        const d = res.data.data as Record<string, unknown>
        return {
            email: typeof d.email === 'string' ? d.email : '',
            createdAt: new Date(typeof d.createdAt === 'string' ? d.createdAt : ''),
            resendTimeLimit: typeof d.resendTimeLimit === 'number' ? d.resendTimeLimit : 0,
            validTimeLimit: typeof d.validTimeLimit === 'number' ? d.validTimeLimit : 0,
            timeSentAgo: typeof d.timeSentAgo === 'number' ? d.timeSentAgo : 0,
            isThrottled: typeof d.isThrottled === 'boolean' ? d.isThrottled : false,
            isValid: typeof d.isValid === 'boolean' ? d.isValid : false,
        }
    })
}

export async function confirmEmail(token: string): Promise<void> {
    return apiCall(async client => {
        await client.get(`/api/auth/email/confirmation/confirm/${encodeURIComponent(token)}`)
    })
}

export async function resendEmailConfirmation(): Promise<void> {
    return apiCall(async client => {
        await client.post('/api/auth/email/confirmation/resend')
    })
}
