document.addEventListener("DOMContentLoaded", function () {
  const more = document.querySelector(".more") as HTMLElement | null;
  const btn = document.querySelector(".more-btn") as HTMLElement | null;
  if (btn && more) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      more.classList.toggle("open");
    });
  }

  const t = document.querySelector(".mobile-toggle") as HTMLElement | null;
  const m = document.querySelector(".mobile-menu") as HTMLElement | null;
  const c = document.querySelector(".mobile-close") as HTMLElement | null;
  if (t && m) t.addEventListener("click", () => m.classList.add("open"));
  if (c && m) c.addEventListener("click", () => m.classList.remove("open"));

  document.querySelectorAll(".table-search").forEach((input) => {
    const el = input as HTMLInputElement;
    el.addEventListener("input", () => {
      const wrap = el.closest(".filterbar")?.nextElementSibling as HTMLElement | null;
      if (!wrap) return;
      const table = wrap.querySelector("table");
      if (!table) return;
      const q = el.value.toLowerCase();
      table.querySelectorAll("tbody tr").forEach((tr) => {
        const row = tr as HTMLElement;
        row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
      });
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const el = btn as HTMLElement;
    el.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      el.classList.add("active");
      const p = document.getElementById("tab-" + el.dataset.tab);
      if (p) p.classList.add("active");
    });
  });
});
