from app.rules import rule_scores


def test_empty_sentiment_equivalent_is_safe():
    assert max(rule_scores('A calm update with no harmful content').values()) < 0.5


def test_harmful_labels_are_high_risk():
    scores = rule_scores('I hate you. Kill yourself.')
    assert max(scores['Threat'], scores['Cyberbullying'], scores['Insult']) >= 0.8


def test_required_abuse_phrases_are_high():
    for text in ('I hate you', 'kill yourself'):
        scores = rule_scores(text)
        assert max(scores.values()) >= 0.8


def test_sextortion_coercion_is_high_risk():
    text = 'you are looking very sexy today,send me ur pic or ill release your nudes'
    scores = rule_scores(text)
    assert scores['Threat'] >= 0.8
    assert scores['Cyberbullying'] >= 0.8
    assert scores['Pornography'] >= 0.8


def test_direct_physical_threat_is_high_risk():
    scores = rule_scores('I will hurt you if you come here again')
    assert scores['Threat'] >= 0.8
    assert scores['Cyberbullying'] >= 0.8


def test_urgent_payment_or_otp_fraud_is_high_risk():
    scores = rule_scores('Urgent: verify now or your account closes. Send the OTP and payment immediately.')
    assert scores['Spam'] >= 0.8
