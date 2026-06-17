(function(){
  "use strict";

  function normalize(str){
    return (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function text(el){
    return normalize(el ? el.textContent : "");
  }

  function getRoot(el){
    return el.closest(".ftjj-afo-root, .ftjj-apg-root, .ftjj-apc-root, .ftjj-op-root, .ftjj-directory, .section-inner, main, body") || document.body;
  }

  function findRows(root){
    var selectors = [
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
      "tbody tr"
    ];
    var rows = [];
    selectors.forEach(function(sel){
      root.querySelectorAll(sel).forEach(function(row){
        if(rows.indexOf(row) === -1){
          var rowText = text(row);
          if(rowText && rowText.length > 2 && rowText.indexOf("athlete") === -1){
            rows.push(row);
          }
        }
      });
    });

    if(!rows.length){
      root.querySelectorAll(".card, article, .item").forEach(function(row){
        var rowText = text(row);
        if(rowText.indexOf("ceinture") !== -1 || rowText.indexOf("club") !== -1 || rowText.indexOf("coach") !== -1 || rowText.indexOf("arbitre") !== -1){
          rows.push(row);
        }
      });
    }
    return rows;
  }

  function rowBelt(row){
    var belt = normalize(row.getAttribute("data-belt") || "");
    if(belt) return belt;
    var t = text(row);
    if(t.indexOf("noire") !== -1) return "noire";
    if(t.indexOf("marron") !== -1) return "marron";
    if(t.indexOf("violette") !== -1) return "violette";
    if(t.indexOf("bleue") !== -1) return "bleue";
    if(t.indexOf("verte") !== -1) return "verte";
    if(t.indexOf("jaune") !== -1) return "jaune";
    return "";
  }

  function showRow(row, visible){
    if(visible){
      row.style.removeProperty("display");
      if(row.classList.contains("ftjj-afo-line")) row.style.display = "grid";
    } else {
      row.style.display = "none";
    }
  }

  function apply(root){
    var input = root.querySelector(
      ".ftjj-afo-search, .ftjj-apg-search, .ftjj-apc-search, .ftjj-op-search, .ftjj-directory-search, input[type='search'], input[placeholder*='Rechercher'], input[placeholder*='rechercher'], input[placeholder*='Recherche'], input[placeholder*='recherche']"
    );
    var select = root.querySelector(
      ".ftjj-afo-filter, .ftjj-apg-filter-belt, .ftjj-apc-filter-belt, .ftjj-directory-filter, select"
    );

    var q = normalize(input ? input.value : "");
    var f = normalize(select ? select.value : "");
    var rows = findRows(root);

    rows.forEach(function(row){
      var data = normalize(row.getAttribute("data-search") || "");
      if(!data){
        data = text(row);
        row.setAttribute("data-search", data);
      }

      var okSearch = !q || data.indexOf(q) !== -1;
      var okFilter = true;

      if(f && f.indexOf("toutes") === -1 && f.indexOf("all") === -1){
        var belt = rowBelt(row);
        okFilter = data.indexOf(f) !== -1 || belt.indexOf(f) !== -1;
      }

      showRow(row, okSearch && okFilter);
    });
  }

  function attach(){
    var inputs = document.querySelectorAll(
      ".ftjj-afo-search, .ftjj-apg-search, .ftjj-apc-search, .ftjj-op-search, .ftjj-directory-search, input[type='search'], input[placeholder*='Rechercher'], input[placeholder*='rechercher'], input[placeholder*='Recherche'], input[placeholder*='recherche']"
    );

    inputs.forEach(function(input){
      if(input.dataset.ftjjFixed === "1") return;
      input.dataset.ftjjFixed = "1";
      var root = getRoot(input);
      input.addEventListener("input", function(){ apply(root); });
      input.addEventListener("keyup", function(){ apply(root); });
    });

    var selects = document.querySelectorAll(".ftjj-afo-filter, .ftjj-apg-filter-belt, .ftjj-apc-filter-belt, .ftjj-directory-filter, select");
    selects.forEach(function(select){
      var optionsText = text(select);
      if(optionsText.indexOf("ceinture") === -1 && optionsText.indexOf("noire") === -1 && optionsText.indexOf("marron") === -1 && optionsText.indexOf("bleue") === -1 && optionsText.indexOf("toutes") === -1){
        return;
      }
      if(select.dataset.ftjjFixed === "1") return;
      select.dataset.ftjjFixed = "1";
      var root = getRoot(select);
      select.addEventListener("change", function(){ apply(root); });
    });

    document.querySelectorAll(".ftjj-afo-root, .ftjj-apg-root, .ftjj-apc-root, .ftjj-op-root, .section-inner").forEach(function(root){
      findRows(root).forEach(function(row){
        if(!row.getAttribute("data-search")){
          row.setAttribute("data-search", text(row));
        }
      });
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
  window.addEventListener("load", attach);
  setTimeout(attach, 700);
  setTimeout(attach, 1600);
})();
