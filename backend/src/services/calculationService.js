function calculateAmount(personCount, locationAmount) {
  if (personCount <= 0) {
    throw new Error('出行人数必须大于0');
  }

  if (personCount === 1) {
    return personCount * locationAmount;
  } else {
    return personCount * locationAmount * (1 - personCount * 0.1);
  }
}

module.exports = { calculateAmount };
