from .labels import LABELS


def rule_scores(text: str) -> dict[str, float]:
    """Emergency fallback used only when the supplied model cannot load."""
    value = text.casefold()
    scores = {label: 0.02 for label in LABELS}
    sextortion = (
        'sextortion' in value
        or 'release your nudes' in value
        or 'release ur nudes' in value
        or ('send me' in value and any(term in value for term in ('nude', 'nudes', 'pic', 'photo')) and any(term in value for term in ('release', 'post', 'share')))
    )
    direct_threat = any(term in value for term in (
        'kill yourself', 'i hate you', 'i will hurt you', "i'll hurt you", 'hurt you',
        'i will kill you', "i'll kill you", 'shoot you', 'stab you', 'come after you',
        'find you and hurt you', 'physical harm', 'threat'
    ))
    urgent_financial = (
        any(term in value for term in ('urgent', 'immediately', 'act now', 'verify now', 'last chance'))
        and any(term in value for term in ('pay', 'payment', 'card', 'bank', 'transfer', 'otp', 'one-time password', 'one time password'))
    )

    if direct_threat:
        scores['Threat'] = 0.96
        scores['Cyberbullying'] = 0.91
    if sextortion:
        scores['Threat'] = max(scores['Threat'], 0.96)
        scores['Cyberbullying'] = max(scores['Cyberbullying'], 0.94)
        scores['Pornography'] = max(scores['Pornography'], 0.94)
    if urgent_financial:
        scores['Spam'] = max(scores['Spam'], 0.94)
    if any(term in value for term in ('idiot', 'stupid', 'loser', 'hate you')):
        scores['Insult'] = max(scores['Insult'], 0.92)
        scores['Cyberbullying'] = max(scores['Cyberbullying'], 0.86)
    if any(term in value for term in ('fuck', 'shit', 'bitch')):
        scores['Profanity'] = max(scores['Profanity'], 0.96)
    if any(term in value for term in ('you cannot join', 'not invited', 'go away', 'leave us')):
        scores['Exclusion'] = max(scores['Exclusion'], 0.88)
    if any(term in value for term in ('nude', 'porn', 'explicit photo')):
        scores['Pornography'] = max(scores['Pornography'], 0.94)
    if any(term in value for term in ('buy now', 'click here', 'limited offer', 'free prize')):
        scores['Spam'] = max(scores['Spam'], 0.88)
    return scores
