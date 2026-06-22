import { useState } from 'react';
import { sendPlanFeedback } from '../services/api';

/**
 * Retour 👍/👎 sur un plan généré (repas ou sport).
 * planType : 'meal' | 'workout'
 */
function PlanFeedback({ planType, planId = '' }) {
  const [sent, setSent] = useState(null); // null | true (like) | false (dislike)

  const submit = async (liked) => {
    setSent(liked);
    try {
      await sendPlanFeedback(planType, liked, planId);
    } catch {
      /* feedback best-effort : on n'embête pas l'utilisateur si ça échoue */
    }
  };

  if (sent !== null) {
    return (
      <p className="plan-feedback-thanks" role="status">
        Merci pour ton retour 🙏 {sent ? 'On garde le cap !' : 'On fera mieux la prochaine fois.'}
      </p>
    );
  }

  return (
    <div className="plan-feedback">
      <span className="plan-feedback-q">Ce plan te convient&nbsp;?</span>
      <button type="button" className="plan-feedback-btn" onClick={() => submit(true)} aria-label="J'aime ce plan">
        👍 Oui
      </button>
      <button type="button" className="plan-feedback-btn" onClick={() => submit(false)} aria-label="Je n'aime pas ce plan">
        👎 Bof
      </button>
    </div>
  );
}

export default PlanFeedback;
