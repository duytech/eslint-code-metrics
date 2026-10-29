export function add(a, b) {
  return a + b;
}

export function classify(order, user, config) {
  let score = 0;
  if (order.total > 1000 && user.vip) score += 10;
  else if (order.total > 500 || user.loyalty > 3) score += 5;
  for (const item of order.items) {
    if (item.discount) score -= item.discount > 0.5 ? 3 : 1;
    switch (item.category) {
      case 'food': score += 1; break;
      case 'tech': score += config.techBonus ?? 2; break;
      case 'book': score += 0.5; break;
      default: score += 0;
    }
    while (item.qty-- > 10) score += 0.1;
  }
  try {
    score = config.adjust(score, order, user);
  } catch (error) {
    console.warn(error);
  }
  return score > 20 ? 'gold' : score > 10 ? 'silver' : score > 0 ? 'bronze' : 'none';
}
