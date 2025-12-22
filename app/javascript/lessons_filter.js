document.addEventListener("turbo:load", () => {
  const input = document.querySelector("[data-lessons-filter]") || document.getElementById("lesson-filter");
  const cards = Array.from(document.querySelectorAll("[data-lesson-card]"));
  const emptyState = document.getElementById("lessons-empty-state");

  if (!input || cards.length === 0) return;

  const applyFilter = () => {
    const q = (input.value || "").toLowerCase().trim();
    let shown = 0;

    cards.forEach((card) => {
      const text = (card.getAttribute("data-filter-text") || card.textContent || "").toLowerCase();
      const match = q === "" || text.includes(q);
      card.style.display = match ? "" : "none";
      if (match) shown += 1;
    });

    if (emptyState) {
      emptyState.style.display = shown === 0 ? "" : "none";
    }
  };

  input.addEventListener("input", applyFilter);
  applyFilter();
});
