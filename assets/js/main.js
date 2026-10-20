(function () {
  document.documentElement.classList.add("js-ready");

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const footerTime = document.getElementById("footer-time");
  if (footerTime) {
    const weimarFormatter = new Intl.DateTimeFormat("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Berlin",
    });
    const updateWeimarTime = () => {
      footerTime.textContent = weimarFormatter.format(new Date());
    };
    updateWeimarTime();
    window.setInterval(updateWeimarTime, 1000);
  }

  const nav = document.querySelector("nav");
  const navCenter = nav && nav.querySelector(".nav-center");

  

  if (nav && navCenter) {
    if (!navCenter.id) navCenter.id = "primary-navigation";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "nav-menu-toggle";
    menuButton.setAttribute("aria-controls", navCenter.id);
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Menu";
    nav.append(menuButton);

    const setMenuOpen = (open) => {
      nav.classList.toggle("nav-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "Close" : "Menu";
    };

    menuButton.addEventListener("click", () => {
      setMenuOpen(!nav.classList.contains("nav-open"));
    });

    navCenter.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    });
  }

  document.querySelectorAll("[data-photo-inview]").forEach((section) => {
    const items = section.querySelectorAll(".photo-card, .photo-side-card, .photo-note, .photo-tile");

    items.forEach((item, index) => {
      item.style.setProperty("--photo-stagger", `${index * 90}ms`);
    });

    const reveal = () => section.classList.add("photo-inview-visible");
    const safetyTimer = window.setTimeout(reveal, 1400);

    if (!("IntersectionObserver" in window)) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          window.clearTimeout(safetyTimer);
          reveal();
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    observer.observe(section);
  });

  if (document.body.hasAttribute("data-project-page")) {
    const shade = document.createElement("div");
    shade.className = "project-scroll-shade";
    shade.setAttribute("aria-hidden", "true");

    const track = document.createElement("div");
    track.className = "project-scroll-track";
    track.setAttribute("aria-hidden", "true");

    const progress = document.createElement("div");
    progress.className = "project-scroll-progress";
    track.append(progress);
    document.body.prepend(shade, track);

    let frame = 0;

    const renderProgress = () => {
      frame = 0;
      const scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const value = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progress.style.transform = `scale3d(${value.toFixed(5)}, 1, 1)`;
    };

    const scheduleProgress = () => {
      if (!frame) frame = window.requestAnimationFrame(renderProgress);
    };

    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", scheduleProgress);
    window.addEventListener("load", scheduleProgress, { once: true });
    scheduleProgress();
  }

  if (document.body.dataset.project === "neo-ai") {
    const dialog = document.createElement("dialog");
    dialog.className = "wip-dialog";
    dialog.setAttribute("aria-labelledby", "wip-dialog-title");
    dialog.innerHTML = `
      <div class="wip-dialog-inner">
        <div class="wip-dialog-kicker">STATUS // WORK IN PROGRESS</div>
        <h2 class="wip-dialog-title" id="wip-dialog-title">Neo AI is still evolving.</h2>
        <p class="wip-dialog-copy">The story and final outcomes are still being refined. You can explore what's been built so far or return to other projects.</p>
        <button class="wip-dialog-close" type="button">Continue exploring →</button>
      </div>`;
    document.body.append(dialog);

    const closeBtn = dialog.querySelector('.wip-dialog-close');
    closeBtn.addEventListener('click', () => dialog.close());

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
})();
