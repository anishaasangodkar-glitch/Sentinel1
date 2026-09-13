import type { Analysis, InputType, RiskDNA, Severity } from '../types/risk.js'

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const emptyDNA = (): RiskDNA => ({ urgency: 0, secrecy: 0, manipulation: 0, threat: 0, privacy: 0, financialPressure: 0, isolation: 0, targeting: 0 })
const has = (t: string, words: string[]) => words.some(w => t.includes(w))

export function analyzeContent(content: string, inputType: InputType = 'message'): Analysis {
  const raw = content.trim()
  const t = raw.toLowerCase()
  const dna = emptyDNA()
  const signals: string[] = []
  let score = 8; let category = 'Safe / Low Risk'
  let confidence: number | undefined = inputType === 'screenshot' ? 58 : 92
  let explanation = 'No strong risk pattern was detected in this sample. Keep using your judgment and avoid sharing sensitive information.'
  let consequences = ['The conversation can continue normally', 'Keep personal details private and check links before opening them']
  let actions = ['Continue at your own pace', 'Keep personal information private', 'Talk to someone you trust if the context changes']

  if (has(t, ['suicide', 'kill myself', 'end my life', 'hurt myself', 'not want to live'])) {
    category = 'Support-first concern'; score = 24; dna.threat = 18; dna.isolation = 34; dna.targeting = 12
    signals.push('Possible self-harm language', 'Immediate support may be needed')
    explanation = 'This message may describe serious emotional distress. Sentinel does not judge or diagnose; the safest next step is immediate human support and checking whether the person is in immediate danger.'
    consequences = ['The person may remain alone with intense distress', 'A trusted person can help create immediate safety', 'Urgent services may be needed if there is immediate danger']
    actions = ['If someone may act now, contact local emergency services immediately', 'Stay with the person or help them reach a trusted adult or crisis professional', 'Do not promise secrecy when someone may be in danger']
  } else if (/sextortion|release (your|ur) nudes|(?:send me|send) .*?(?:nude|nudes|pic|photo).*?(?:release|post|share)/i.test(t)) {
    category = 'Sextortion / Image-based threat'; score = 97; dna.threat = 96; dna.privacy = 94; dna.urgency = 88; dna.financialPressure = 82; dna.manipulation = 91
    signals.push('Intimate-image threat', 'Blackmail pressure', 'Privacy risk', 'Coercive manipulation')
    explanation = 'The content combines sexual-image pressure with a threat to release private material. This is a high-risk coercion pattern; the person being targeted is not at fault.'
    consequences = ['More demands may follow after compliance', 'The material may be shared or used to pressure others', 'The person may feel isolated or unsafe']
    actions = ['Do not pay or send more material', 'Preserve messages, usernames, and payment requests without forwarding the image', 'Tell a trusted adult or support professional immediately', 'Report the account and seek urgent help if there is immediate danger']
  } else if (/\b(?:i will|i'll|i am going to|i'm going to)\s+(?:hurt|kill|shoot|stab)\s+you\b/i.test(t) || /\b(?:shoot|stab|hurt) you\b/i.test(t)) {
    category = 'Threat / Harassment'; score = 96; dna.threat = 98; dna.targeting = 88; dna.manipulation = 64
    signals.push('Direct physical threat', 'Personal targeting', 'Safety risk')
    explanation = 'The message contains a direct threat of physical harm toward a person. Treat it as a safety concern, preserve the context, and seek help rather than responding alone.'
    consequences = ['The threat may escalate or continue', 'The sender may try to isolate or intimidate the target', 'Immediate safety planning may be needed']
    actions = ['Do not meet or respond alone', 'Save the message, username, and time', 'Tell a trusted adult, school, platform, or local authority', 'Contact emergency services if someone may be in immediate danger']
  } else if (/urgent|immediately|act now|verify now|last chance/i.test(t) && /pay|payment|card|bank|transfer|otp|one-time password|one time password/i.test(t)) {
    category = 'Scam / Fraud'; score = 94; dna.urgency = 92; dna.financialPressure = 96; dna.privacy = 82; dna.manipulation = 78; dna.targeting = 62
    signals.push('Urgency pressure', 'Payment or OTP request', 'Account or financial risk')
    explanation = 'Urgency is combined with a request for payment, banking information, or a one-time password. This is a strong fraud or phishing pattern.'
    consequences = ['Money or payment details may be lost', 'An OTP could allow an account takeover', 'Further requests may follow after the first response']
    actions = ['Do not send money, card details, passwords, or OTPs', 'Open the service through its official app or typed address', 'Save the message and report the sender', 'Ask a trusted person or official support channel to verify the request']
  } else if ((has(t, ['nude', 'intimate photo', 'private photo', 'explicit picture']) || has(t, ['send this', 'send another'])) && has(t, ['blackmail', 'share it', 'share the', 'post it', 'threat', 'pay'])) {
    category = 'Sextortion / Image-based threat'; score = 97; dna.threat = 96; dna.privacy = 94; dna.urgency = 88; dna.financialPressure = 82; dna.manipulation = 91
    signals.push('Intimate-image threat', 'Blackmail pressure', 'Urgency pressure', 'Privacy risk')
    explanation = 'The content combines a threat involving intimate material with pressure to pay or comply. This is a high-risk coercion pattern; the person being targeted is not at fault.'
    consequences = ['More demands may follow after compliance', 'The material may be shared or used to pressure others', 'The person may feel isolated or unsafe']
    actions = ['Do not pay or send more material', 'Preserve messages, usernames, and payment requests without forwarding the image', 'Tell a trusted adult or support professional immediately', 'Report the account on the platform and seek urgent help if there is immediate danger']
  } else if (has(t, ['whatsapp', 'snapchat', 'telegram', 'signal', 'move this chat', 'talk somewhere else', 'private app']) && has(t, ['talk', 'chat', 'message', 'move', 'instead'])) {
    category = 'Platform-switch manipulation'; score = 64; dna.secrecy = 72; dna.isolation = 58; dna.manipulation = 66; dna.targeting = 48
    signals.push('Request to leave the current platform', 'Reduced visibility', 'Context needs review')
    explanation = 'A request to move a conversation to a less visible app can reduce the support and context around it. On its own this is an early-warning signal, not proof of harm; consider who is asking and why.'
    consequences = ['The conversation may become harder for trusted people to see', 'Pressure can increase in a less visible channel', 'Important context may be lost if messages disappear']
    actions = ['Pause before moving the conversation', 'Keep the current context and avoid sharing private details', 'Ask a trusted person to review the situation if the request feels uncomfortable']
  } else if (has(t, ['address', 'school name', 'phone number', 'home address', 'where do you live']) && has(t, ['send', 'share', 'give', 'tell', 'post', 'drop'])) {
    category = 'Doxxing / Personal information exposure'; score = 84; dna.privacy = 96; dna.targeting = 76; dna.manipulation = 48; dna.urgency = 32
    signals.push('Address or school exposure', 'Phone-number request', 'Targeting risk', 'Personal information without clear context')
    explanation = 'An address, school, or phone number is being requested or exposed without a clear legitimate reason. These details can make someone easier to contact, locate, or target.'
    consequences = ['The information may be copied or reshared', 'Unwanted contact may become easier', 'A routine or location may become identifiable']
    actions = ['Do not send more personal information', 'Remove or limit visibility if the information is public', 'Save the context and tell a trusted adult if you feel exposed', 'Report the post or account when it is safe to do so']
  } else if (has(t, ['challenge', 'dare', 'viral', ' prove you', 'everyone is doing', 'no one will know']) && has(t, ['hurt', 'jump', 'swallow', 'drive', 'fire', 'dangerous', 'do it'])) {
    category = 'Dangerous challenge / Peer pressure'; score = 78; dna.urgency = 62; dna.manipulation = 82; dna.threat = 44; dna.targeting = 58
    signals.push('Dangerous activity request', 'Social inclusion pressure', 'Fear of being left out')
    explanation = 'The message frames a potentially dangerous act as a way to prove belonging. That is peer pressure, not a safe test of friendship or courage.'
    consequences = ['Someone could be injured trying to keep up', 'The content may be recorded or reshared', 'Pressure can continue after someone says no']
    actions = ['Do not participate just to prove belonging', 'Leave or mute the conversation if needed', 'Tell a trusted adult or friend what is being asked', 'If someone is in immediate danger, contact local emergency help']
  } else if (has(t, ['send first', 'item trade', 'trade first', 'free giveaway', 'giveaway', 'skin', 'robux', 'gift card']) && has(t, ['pay', 'send', 'trade', 'code', 'deposit'])) {
    category = 'Gaming marketplace scam'; score = 88; dna.financialPressure = 82; dna.urgency = 74; dna.manipulation = 71; dna.targeting = 56
    signals.push('Send-first trade request', 'Gaming item or giveaway lure', 'Payment or code pressure')
    explanation = 'A gaming item, giveaway, or trade offer asks you to send money, an item, or a code first. That reverses the safer order and is a common marketplace scam pattern.'
    consequences = ['An item, account, or payment may be lost', 'The scammer may ask for more codes or fees', 'The account may be targeted again']
    actions = ['Do not send first or share a gift card code', 'Use the platform’s official trade system if one exists', 'Save the username and report the offer', 'Ask a trusted person before making a trade']
  } else if (has(t, ['cheat', 'mod menu', 'free skins', 'hack', 'crack', 'download']) && has(t, ['password', 'disable antivirus', 'exe', 'apk', 'link', 'login'])) {
    category = 'Game cheat / Malware link'; score = 90; dna.privacy = 78; dna.urgency = 74; dna.manipulation = 66; dna.targeting = 48
    signals.push('Cheat or mod lure', 'Suspicious download or login', 'Device/account compromise risk')
    explanation = 'Free cheats, mods, or game content that ask for a login, an unusual download, or security changes can be used to steal accounts or install malware.'
    consequences = ['A malicious file could affect the device', 'Game or email credentials could be stolen', 'The account may be used to target other people']
    actions = ['Do not download the file or disable security tools', 'Use the game’s official store or support page', 'Run a trusted security check if you already opened it', 'Change reused passwords from a clean device']
  } else if (has(t, ['infinite scroll', 'loot box', 'gacha', 'streak', 'log in every day', 'keep scrolling']) && has(t, ['buy', 'reward', 'miss out', 'lose your streak', 'one more'])) {
    category = 'Digital Wellbeing / Manipulative design'; score = 28; dna.urgency = 24; dna.manipulation = 58; dna.financialPressure = 34
    signals.push('Streak or return pressure', 'Variable reward design', 'Attention or spending prompt')
    explanation = 'The design uses rewards, streaks, or endless content to keep attention or encourage spending. This is a digital-wellbeing signal, not an emergency danger alert.'
    consequences = ['More time or money may be spent than intended', 'Stopping may feel harder after repeated rewards', 'Sleep, focus, or mood may be affected']
    actions = ['Set a time or spending limit', 'Turn off non-essential notifications', 'Take a break and check how the app makes you feel']
  } else if (has(t, ['don\'t tell', 'dont tell', 'keep this', 'secret', 'private']) && has(t, ['number', 'phone', 'parents', 'alone', 'chat'])) {
    category = 'Grooming / Manipulation'; score = 87; dna.secrecy = 92; dna.isolation = 84; dna.manipulation = 88; dna.privacy = 74; dna.targeting = 72
    signals.push('Secrecy request', 'Move to a private channel', 'Personal information request', 'Isolation pressure')
    explanation = 'This interaction combines a request for secrecy, movement away from visible support, and a request for personal information — patterns that can be associated with manipulation.'
    consequences = ['Share a phone number or private detail', 'Move into a less visible conversation', 'Reduced support or oversight', 'Potential pressure to do more']
    actions = ['Do not share personal information or move to a private channel', 'Save the conversation before blocking or reporting', 'Tell a trusted adult or friend what happened']
  } else if (has(t, ['won', 'prize', 'reward', 'claim']) && has(t, ['pay', '₹', 'money', 'fee', 'transfer'])) {
    category = 'Scam / Fraud'; score = 94; dna.urgency = 86; dna.financialPressure = 96; dna.manipulation = 78; dna.targeting = 62
    signals.push('Unexpected reward', 'Payment request', 'Urgency pressure', 'Too-good-to-be-true offer')
    explanation = 'An unexpected reward paired with an upfront payment and a deadline is a strong scam pattern. Legitimate prizes rarely require a fee to release them.'
    consequences = ['Send money to an unknown recipient', 'Payment details may be reused', 'Further demands or financial loss', 'Personal information may be exposed']
    actions = ['Do not send money or payment details', 'Do not reply; save the message as evidence', 'Block and report the sender', 'Check the claim through an official channel']
  } else if (has(t, ['verify', 'suspended', 'login', 'account']) && (has(t, ['http', 'link', 'click', 'password']) || inputType === 'website')) {
    category = 'Phishing / Credential Theft'; score = 91; dna.urgency = 90; dna.privacy = 78; dna.manipulation = 72; dna.targeting = 65
    signals.push('Account threat', 'Suspicious link', 'Urgency pressure', 'Credential risk')
    explanation = 'The message creates fear about an account and pushes immediate verification through a link. This is commonly used to capture login credentials.'
    consequences = ['Open a fake sign-in page', 'Credentials could be collected', 'Account compromise', 'Potential privacy or financial loss']
    actions = ['Do not click the link or enter a password', 'Open the service using its official app or typed address', 'Change your password if you already entered it', 'Report the message']
  } else if (has(t, ['pathetic', 'hates you', 'posting', 'leave', 'everyone']) && has(t, ['you', 'group'])) {
    category = 'Cyberbullying / Harassment'; score = 82; dna.threat = 68; dna.targeting = 94; dna.manipulation = 62; dna.isolation = 52
    signals.push('Personal targeting', 'Group pressure', 'Repeated humiliation', 'Threatening tone')
    explanation = 'The language targets a person, recruits a group, and signals continued humiliation. That combination can indicate harassment rather than ordinary conflict.'
    consequences = ['The posts may continue or spread', 'Stress and isolation may increase', 'The content could be difficult to remove later']
    actions = ['Do not engage while emotions are high', 'Save messages and usernames', 'Block/report if it feels safe', 'Talk to a trusted person or school support']
  } else if (has(t, ['school', 'location', 'route', 'tomorrow', 'am']) && has(t, ['8', 'home', 'going'])) {
    category = 'Privacy / Oversharing'; score = 76; dna.privacy = 95; dna.targeting = 56; dna.urgency = 34
    signals.push('Location exposure', 'Routine revealed', 'School information', 'Personal safety detail')
    explanation = 'The content reveals a school, a predictable time, and a routine. Individually these details may feel harmless, but together they can make someone easier to locate.'
    consequences = ['A stranger could infer a routine', 'The information may be copied or reshared', 'Unwanted contact could become easier']
    actions = ['Remove specific locations and routines', 'Review who can see the post', 'Ask a trusted adult to help if the information is public', 'Avoid posting real-time location updates']
  } else if (inputType === 'screenshot') {
    category = 'Screenshot review'; score = 0; dna.privacy = 0; dna.targeting = 0
    confidence = undefined
    signals.push('Screenshot content was not available to local safety rules')
    explanation = 'The live visual analysis service was unavailable, and local text rules cannot read the screenshot contents. No risk score or model confidence is assigned.'
    consequences = ['Important context may be missed until the live visual service is available', 'Visible personal information could still be present in the image']
    actions = ['Retry when the analysis service is available', 'Review the original context manually', 'Blur or remove personal details before sharing']
  }
  if (category === 'Safe / Low Risk' && raw.length < 24) {
    category = 'Insufficient context'; score = 10; confidence = 35
    signals.push('Not enough context to assess safely')
    explanation = 'There is not enough context in this sample to make a useful safety assessment. Add the surrounding message, what was asked of you, and any link or deadline if it is safe to do so.'
    consequences = ['A short sample may hide important context', 'A fuller view can make the next step clearer']
    actions = ['Add the surrounding context without sharing passwords or private details', 'If you feel unsafe, pause and ask a trusted person to review it with you']
  }
  const severity: Severity = score >= 90 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
  return { id: `INC-${Math.floor(1000 + Math.random() * 8999)}`, riskScore: clamp(score), severity, category, summary: category === 'Safe / Low Risk' ? 'Looks low risk' : category === 'Insufficient context' ? 'More context would help' : `Potential ${category.toLowerCase()} detected`, riskDNA: dna, detectedSignals: signals, explanation, consequences, recommendedActions: actions, confidence, inputType, content: raw, createdAt: new Date().toISOString() }
}
