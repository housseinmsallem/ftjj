(function () {
  "use strict";

  function normalize(str: string | null | undefined): string {
    return (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function text(el: Element | null): string {
    return normalize(el ? el.textContent : "");
  }

  function getRoot(el: Element): Element {
    return el.closest(
      ".ftjj-afo-root, .ftjj-apg-root, .ftjj-apc-root, .ftjj-op-root, .ftjj-directory, .section-inner, main, body",
    ) || document.body;
  }

  function findRows(root: Element): Element[] {
    const selectors = [
      ".ftjj-afo-line[data-search]",
      ".ftjj-afo-line",
      ".ftjj-apg-row",
      ".ftjj-apc-row",
      ".ftjj-op-row",
      ".ftjj-athlete-row",
      ".ftjj-coach-row",
      ".ftjj-referee-row",
      ".athlete-row",
      ".coach-row",
      ".referee-row",
      ".directory-row",
      ".ranking-row",
      ".card-athlete",
      ".card-coach",
      ".card-referee",
      ".ftjj-card-row",
      "tbody tr",
    ];
    const rows: Element[] = [];
    selectors.forEach((sel) => {
      root.querySelectorAll(sel).forEach((row) => {
        if (rows.indexOf(row) === -1) {
          const rowText = text(row);
          if (rowText && rowText.length > 2 && rowText.indexOf("athlete") === -1) {
            rows.push(row);
          }
        }
      });
    });

    if (!rows.length) {
      root.querySelectorAll(".card, article, .item").forEach((row) => {
        const rowText = text(row);
        if (
          rowText.indexOf("ceinture") !== -1 ||
          rowText.indexOf("club") !== -1 ||
          rowText.indexOf("coach") !== -1 ||
          rowText.indexOf("arbitre") !== -1
        ) {
          rows.push(row);
        }
      });
    }
    return rows;
  }

  function rowBelt(row: Element): string {
    const belt = normalize(row.getAttribute("data-belt") || "");
    if (belt) return belt;
    const t = text(row);
    if (t.indexOf("noire") !== -1) return "noire";
    if (t.indexOf("marron") !== -1) return "marron";
    if (t.indexOf("violette") !== -1) return "violette";
    if (t.indexOf("bleue") !== -1) return "bleue";
    if (t.indexOf("verte") !== -1) return "verte";
    if (t.indexOf("jaune") !== -1) return "jaune";
    return "";
  }

  function showRow(row: HTMLElement, visible: boolean): void {
    if (visible) {
      row.style.removeProperty("display");
      if (row.classList.contains("ftjj-afo-line")) row.style.display = "grid";
    } else {
      row.style.display = "none";
    }
  }

  function apply(root: Element): void {
    const input = root.querySelector(
      ".ftjj-afo-search, .ftjj-apg-search, .ftjj-apc-search, .ftjj-op-search, .ftjj-directory-search, input[type='search'], input[placeholder*='Rechercher'], input[placeholder*='rechercher'], input[placeholder*='Recherche'], input[placeholder*='recherche']",
    ) as HTMLInputElement | null;
    const select = root.querySelector(
      ".ftjj-afo-filter, .ftjj-apg-filter-belt, .ftjj-apc-filter-belt, .ftjj-directory-filter, select",
    ) as HTMLSelectElement | null;

    const q = normalize(input ? input.value : "");
    const f = normalize(select ? select.value : "");
    const rows = findRows(root);

    rows.forEach((row) => {
      let data = normalize(row.getAttribute("data-search") || "");
      if (!data) {
        data = text(row);
        row.setAttribute("data-search", data);
      }

      const okSearch = !q || data.indexOf(q) !== -1;
      let okFilter = true;

      if (f && f.indexOf("toutes") === -1 && f.indexOf("all") === -1) {
        const belt = rowBelt(row);
        okFilter = data.indexOf(f) !== -1 || belt.indexOf(f) !== -1;
      }

      showRow(row as HTMLElement, okSearch && okFilter);
    });
  }

  function attach(): void {
    const inputs = document.querySelectorAll(
      ".ftjj-afo-search, .ftjj-apg-search, .ftjj-apc-search, .ftjj-op-search, .ftjj-directory-search, input[type='search'], input[placeholder*='Rechercher'], input[placeholder*='rechercher'], input[placeholder*='Recherche'], input[placeholder*='recherche']",
    );

    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      if (el.dataset.ftjjFixed === "1") return;
      el.dataset.ftjjFixed = "1";
      const root = getRoot(el);
      el.addEventListener("input", () => { apply(root); });
      el.addEventListener("keyup", () => { apply(root); });
    });

    const selects = document.querySelectorAll(
      ".ftjj-afo-filter, .ftjj-apg-filter-belt, .ftjj-apc-filter-belt, .ftjj-directory-filter, select",
    );
    selects.forEach((select) => {
      const el = select as HTMLSelectElement;
      const optionsText = text(el);
      if (
        optionsText.indexOf("ceinture") === -1 &&
        optionsText.indexOf("noire") === -1 &&
        optionsText.indexOf("marron") === -1 &&
        optionsText.indexOf("bleue") === -1 &&
        optionsText.indexOf("toutes") === -1
      ) {
        return;
      }
      if (el.dataset.ftjjFixed === "1") return;
      el.dataset.ftjjFixed = "1";
      const root = getRoot(el);
      el.addEventListener("change", () => { apply(root); });
    });

    document
      .querySelectorAll(
        ".ftjj-afo-root, .ftjj-apg-root, .ftjj-apc-root, .ftjj-op-root, .section-inner",
      )
      .forEach((root) => {
        findRows(root).forEach((row) => {
          if (!row.getAttribute("data-search")) {
            row.setAttribute("data-search", text(row));
          }
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
  window.addEventListener("load", attach);
  setTimeout(attach, 700);
  setTimeout(attach, 1600);
})();
