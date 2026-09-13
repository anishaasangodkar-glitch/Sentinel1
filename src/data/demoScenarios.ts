import type { InputType } from '../types/risk'

export const demoScenarios: { label: string; category: string; inputType: InputType; content: string }[] = [
  { label: 'Potential scam', category: 'Scam / Fraud', inputType: 'message', content: 'Congratulations! You have won ₹50,000. Pay ₹499 now to claim your prize. Act fast before your reward expires.' },
  { label: 'Possible grooming', category: 'Grooming / Manipulation', inputType: 'message', content: "Don't tell your parents we're talking. Give me your number and let's chat somewhere private. You're mature enough to keep this between us." },
  { label: 'Suspicious login link', category: 'Phishing / Credential Theft', inputType: 'website', content: 'https://secure-account-verify.example/login — Your account will be suspended. Verify immediately using this link.' },
  { label: 'Cyberbullying', category: 'Cyberbullying / Harassment', inputType: 'message', content: "You are pathetic. Everyone in this group hates you. We're going to keep posting this until you leave." },
  { label: 'Privacy exposure', category: 'Privacy / Oversharing', inputType: 'message', content: "I'm going to Northview school tomorrow at 8 AM. Here is my location and my usual route home." },
  { label: 'Safe message', category: 'Safe / Low Risk', inputType: 'message', content: 'Hey, are you joining the study group tomorrow? I shared the notes in our class folder.' },
]
