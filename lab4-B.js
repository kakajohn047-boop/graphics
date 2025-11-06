// hook up to HTML buttons (Lab4Task1.html)
const incBtn = document.getElementById('incLevel');
const decBtn = document.getElementById('decLevel');
const levelLabel = document.getElementById('levelLabel');

function setLevel(n) {
  currentIteration = Math.max(0, Math.min(6, n));
  if (levelLabel) levelLabel.textContent = currentIteration;
  draw();
}

if (incBtn) incBtn.onclick = () => setLevel(currentIteration + 1);
if (decBtn) decBtn.onclick = () => setLevel(currentIteration - 1);
if (levelLabel) levelLabel.textContent = currentIteration;
