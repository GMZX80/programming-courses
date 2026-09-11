(function () {
  "use strict";

  var body = document.body;
  var toggle = document.querySelector("[data-nav-toggle]");
  var scrim = document.querySelector("[data-nav-scrim]");
  var sidebar = document.getElementById("course-navigation");
  var courseMain = document.querySelector(".course-main");
  var progress = document.querySelector("[data-reading-progress]");
  var compactNavigation = window.matchMedia("(max-width: 58rem)");

  function setNavigation(open) {
    var compactOpen = compactNavigation.matches && open;
    body.classList.toggle("nav-open", compactOpen);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(compactOpen));
    }
    if (sidebar) {
      sidebar.toggleAttribute("inert", compactNavigation.matches && !compactOpen);
      if (compactNavigation.matches) {
        sidebar.setAttribute("aria-hidden", String(!compactOpen));
      } else {
        sidebar.removeAttribute("aria-hidden");
      }
    }
    if (scrim) {
      scrim.hidden = !compactOpen;
    }
    if (courseMain) {
      courseMain.toggleAttribute("inert", compactOpen);
    }
  }

  if (toggle && sidebar) {
    toggle.addEventListener("click", function () {
      setNavigation(!body.classList.contains("nav-open"));
    });
    sidebar.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setNavigation(false);
      }
    });
  }

  if (scrim) {
    scrim.addEventListener("click", function () {
      setNavigation(false);
      if (toggle) {
        toggle.focus();
      }
    });
  }

  compactNavigation.addEventListener("change", function () {
    setNavigation(false);
  });
  setNavigation(false);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && body.classList.contains("nav-open")) {
      setNavigation(false);
      if (toggle) {
        toggle.focus();
      }
    }
  });

  function updateProgress() {
    if (!progress) {
      return;
    }
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var percentage = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
    progress.style.width = percentage + "%";
  }

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  function alignHashTarget() {
    if (!window.location.hash) {
      return;
    }
    var targetId;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch (error) {
      return;
    }
    var target = document.getElementById(targetId);
    if (target) {
      var containingDetails = target.closest("details");
      if (containingDetails && !containingDetails.open) {
        containingDetails.open = true;
      }
      target.scrollIntoView({ block: "start" });
    }
  }

  function queueHashAlignment() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(alignHashTarget);
    });
  }

  function stabiliseHashAlignment() {
    queueHashAlignment();
    [100, 300, 700, 1500].forEach(function (delay) {
      window.setTimeout(function () {
        if (window.location.hash) {
          queueHashAlignment();
        }
      }, delay);
    });
  }

  if (window.location.hash) {
    if (document.readyState === "complete") {
      stabiliseHashAlignment();
    } else {
      window.addEventListener("load", stabiliseHashAlignment, { once: true });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(queueHashAlignment);
    }
  }
  window.addEventListener("hashchange", stabiliseHashAlignment);

  var glossaryReturn = document.querySelector("[data-glossary-return]");
  if (glossaryReturn) {
    var parameters = new URLSearchParams(window.location.search);
    var returnTarget = parameters.get("from") || "";
    var returnLesson = parameters.get("lesson") || "";
    var lessonNumber = "(?:0[1-9]|1[0-9]|2[0-8])";
    var safeTargetPattern = new RegExp(
      "^lesson-" + lessonNumber + "\\.html#(?:glossary-origin-" + lessonNumber + "-\\d{4}|glossary-panel-origin-" + lessonNumber + "-[a-z0-9]+(?:-[a-z0-9]+)*)$"
    );
    var safeTarget = safeTargetPattern.test(returnTarget);
    if (safeTarget) {
      glossaryReturn.setAttribute("href", returnTarget);
      glossaryReturn.textContent = /^\d{2}$/.test(returnLesson)
        ? "← Return to Lesson " + returnLesson
        : "← Return to lesson";
    }
  }

  var glossarySearch = document.querySelector("[data-glossary-search]");
  if (glossarySearch) {
    var entries = Array.prototype.slice.call(document.querySelectorAll("[data-glossary-entry]"));
    var groups = Array.prototype.slice.call(document.querySelectorAll(".glossary-letter-group"));
    var count = document.querySelector("[data-glossary-result-count]");
    var empty = document.querySelector("[data-glossary-empty]");

    function updateGlossary() {
      var query = glossarySearch.value.trim().toLocaleLowerCase();
      var visible = 0;
      entries.forEach(function (entry) {
        var matches = !query || (entry.getAttribute("data-search-text") || "").toLocaleLowerCase().indexOf(query) !== -1;
        entry.hidden = !matches;
        if (matches) {
          visible += 1;
        }
      });
      groups.forEach(function (group) {
        group.hidden = !group.querySelector("[data-glossary-entry]:not([hidden])");
      });
      if (count) {
        count.textContent = visible + (visible === 1 ? " matching term" : " matching terms");
      }
      if (empty) {
        empty.hidden = visible !== 0;
      }
    }

    glossarySearch.addEventListener("input", updateGlossary);
  }
}());
