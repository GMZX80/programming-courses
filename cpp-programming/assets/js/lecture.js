(function () {
  "use strict";

  const viewer = document.querySelector("[data-lecture-slides]");
  if (!viewer) {
    return;
  }

  const image = viewer.querySelector("[data-slide-image]");
  const title = viewer.querySelector("[data-slide-title]");
  const counter = viewer.querySelector("[data-slide-counter]");
  const previous = viewer.querySelector("[data-slide-previous]");
  const next = viewer.querySelector("[data-slide-next]");
  const thumbnails = Array.from(viewer.querySelectorAll("[data-slide-src]"));

  if (!image || !title || !counter || !previous || !next || thumbnails.length === 0) {
    return;
  }

  let currentIndex = 0;

  function showSlide(index, moveFocus) {
    const boundedIndex = Math.max(0, Math.min(index, thumbnails.length - 1));
    const selected = thumbnails[boundedIndex];

    currentIndex = boundedIndex;
    image.src = selected.dataset.slideSrc;
    image.alt = selected.dataset.slideAlt || "Lecture slide";
    title.textContent = selected.dataset.slideTitle || "Lecture slide";
    counter.textContent = String(boundedIndex + 1).padStart(2, "0") + " / " + String(thumbnails.length).padStart(2, "0");

    thumbnails.forEach(function (thumbnail, thumbnailIndex) {
      thumbnail.setAttribute("aria-current", thumbnailIndex === boundedIndex ? "true" : "false");
    });

    previous.disabled = boundedIndex === 0;
    next.disabled = boundedIndex === thumbnails.length - 1;

    if (moveFocus) {
      selected.focus({ preventScroll: true });
    }
  }

  thumbnails.forEach(function (thumbnail, index) {
    thumbnail.addEventListener("click", function () {
      showSlide(index, false);
    });
  });

  previous.addEventListener("click", function () {
    showSlide(currentIndex - 1, false);
  });

  next.addEventListener("click", function () {
    showSlide(currentIndex + 1, false);
  });

  viewer.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(currentIndex - 1, false);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(currentIndex + 1, false);
    } else if (event.key === "Home") {
      event.preventDefault();
      showSlide(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      showSlide(thumbnails.length - 1, true);
    }
  });

  showSlide(0, false);
}());
