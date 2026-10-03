/**
 * Automatic Priority Calculation & Severity Scoring Utility
 */
function calculatePriority(severity, category, supportCount = 0, createdAt = null) {
  let score = 0;
  const reasons = [];

  // 1. Severity Base Score
  switch (severity) {
    case 'critical':
      score += 40;
      reasons.push('Critical severity level');
      break;
    case 'high':
      score += 30;
      reasons.push('High severity level');
      break;
    case 'medium':
      score += 20;
      reasons.push('Medium severity');
      break;
    case 'low':
      score += 10;
      reasons.push('Low severity');
      break;
    default:
      score += 15;
  }

  // 2. Category Urgency Weight
  const criticalCategories = ['Public Safety', 'Drainage & Sewage', 'Water Supply', 'Electricity & Lighting'];
  if (criticalCategories.includes(category)) {
    score += 20;
    reasons.push(`High impact category (${category})`);
  } else {
    score += 10;
  }

  // 3. Community Support Weight (5 points per upvote, capped at 30)
  if (supportCount > 0) {
    const supportBonus = Math.min(supportCount * 5, 30);
    score += supportBonus;
    reasons.push(`${supportCount} community upvote(s)`);
  }

  // 4. Age / Pending Duration Urgency
  if (createdAt) {
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursOld > 48) {
      score += 10;
      reasons.push('Pending > 48h');
    }
  }

  const finalScore = Math.min(score, 100);
  let priorityLevel = 'Normal';

  if (finalScore >= 65) {
    priorityLevel = 'Urgent';
  } else if (finalScore >= 45) {
    priorityLevel = 'High';
  }

  return {
    priorityScore: finalScore,
    priorityLevel,
    priorityReason: reasons.join(' • ') || 'Standard civic issue'
  };
}

module.exports = { calculatePriority };
