/**
 * Reading features of the post page. Returns a cleanup function, called before the next
 * client-side navigation.
 */

/** Elements that extend into the right margin on wide screens (see .article rules in global.css). */
const BREAKOUT = ':scope > figure:not(.code-frame), :scope > p:has(> img:only-child)';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = () => matchMedia('(min-width: 80rem)').matches;

let toastTimer = 0;
function toast(message: string) {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.dataset.visible = '';
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => delete el.dataset.visible, 1800);
}

async function copy(text: string, message: string, button?: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
    const label = button?.querySelector('span');
    if (button && label) {
      button.dataset.copied = '';
      label.textContent = 'Copied';
      setTimeout(() => {
        delete button.dataset.copied;
        label.textContent = 'Copy';
      }, 1800);
    }
  } catch {
    toast("Couldn't copy");
  }
}

// ---- Reading progress, TOC scroll-spy, time left ------------------------------------------

function trackProgress(article: HTMLElement) {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  const rail = document.querySelector<HTMLElement>('[data-toc-progress]');
  const left = document.querySelector<HTMLElement>('[data-toc-left]');
  const minutes = Number(document.querySelector<HTMLElement>('[data-toc]')?.dataset.minutes ?? 0);
  const links = new Map([...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')].map((a) => [a.dataset.tocLink!, a]));
  const headings = [...links.keys()].map((id) => document.getElementById(id)).filter((h): h is HTMLElement => !!h);

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = article.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height - innerHeight * 0.6, 1)));
    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (rail) rail.style.transform = `scaleY(${progress})`;
    if (left) {
      const remaining = Math.ceil(minutes * (1 - progress));
      left.textContent = progress >= 0.99 ? 'Finished' : progress < 0.02 ? `${minutes} min read` : `${remaining} min left`;
    }
    // Current section: the last heading above the upper third of the screen.
    const line = innerHeight * 0.3;
    const current = headings.filter((h) => h.getBoundingClientRect().top < line).at(-1) ?? headings[0];
    links.forEach((link, id) => link.setAttribute('aria-current', String(id === current?.id)));
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
  };
}

// ---- Sidenotes --------------------------------------------------------------------------------

/**
 * On wide screens, footnotes are repeated in the right margin next to their reference.
 * The footnote list stays in the page (visually hidden) for screen readers and print.
 */
function sidenotes(article: HTMLElement) {
  const margin = document.querySelector<HTMLElement>('[data-sidenotes]');
  const refs = [...article.querySelectorAll<HTMLAnchorElement>('a[data-footnote-ref]')];
  if (!margin || !refs.length) return () => {};

  const layout = () => {
    margin.replaceChildren();
    article.classList.toggle('has-sidenotes', wide());
    if (!wide()) return;

    const top = margin.getBoundingClientRect().top;
    // Wide figures extend into the margin; notes must not sit on top of them.
    const blocked = [...article.querySelectorAll<HTMLElement>(BREAKOUT)].map((el) => {
      const r = el.getBoundingClientRect();
      return [r.top - top - 12, r.bottom - top + 12] as const;
    });
    let floor = 0;
    for (const ref of refs) {
      const item = document.getElementById(decodeURIComponent(ref.hash.slice(1)));
      if (!item) continue;
      const note = document.createElement('div');
      note.className = 'sidenote';
      note.dataset.for = item.id;
      const content = item.cloneNode(true) as HTMLElement;
      content.querySelectorAll('[data-footnote-backref]').forEach((a) => a.remove());
      note.innerHTML = `<span class="sidenote-num">${ref.textContent}</span>${content.innerHTML}`;
      margin.append(note);

      let y = Math.max(ref.getBoundingClientRect().top - top - 6, floor);
      for (const [start, end] of blocked) {
        if (y < end && y + note.offsetHeight > start) y = end;
      }
      note.style.transform = `translateY(${Math.round(y)}px)`;
      floor = y + note.offsetHeight + 16;
    }
  };

  const highlight = (event: Event) => {
    if (!wide()) return;
    const target = event.target as Element;
    const ref = target.closest<HTMLAnchorElement>('a[data-footnote-ref]');
    const id = ref ? decodeURIComponent(ref.hash.slice(1)) : target.closest<HTMLElement>('.sidenote')?.dataset.for;
    margin.querySelectorAll<HTMLElement>('.sidenote').forEach((n) => n.classList.toggle('is-active', event.type === 'pointerover' && n.dataset.for === id));
  };
  // With sidenotes visible, a reference click highlights the note instead of jumping to the end.
  const onClick = (event: MouseEvent) => {
    const ref = (event.target as Element).closest<HTMLAnchorElement>('a[data-footnote-ref]');
    if (!ref || !wide()) return;
    event.preventDefault();
    const note = margin.querySelector<HTMLElement>(`[data-for="${CSS.escape(decodeURIComponent(ref.hash.slice(1)))}"]`);
    note?.classList.remove('is-flash');
    void note?.offsetWidth;
    note?.classList.add('is-flash');
  };

  layout();
  const observer = new ResizeObserver(() => layout());
  observer.observe(article);
  document.fonts?.ready.then(layout);
  article.addEventListener('pointerover', highlight);
  article.addEventListener('pointerout', highlight);
  margin.addEventListener('pointerover', highlight);
  margin.addEventListener('pointerout', highlight);
  article.addEventListener('click', onClick);
  return () => {
    observer.disconnect();
    article.removeEventListener('pointerover', highlight);
    article.removeEventListener('pointerout', highlight);
    margin.removeEventListener('pointerover', highlight);
    margin.removeEventListener('pointerout', highlight);
    article.removeEventListener('click', onClick);
  };
}

// ---- Lightbox ---------------------------------------------------------------------------------

function lightbox(article: HTMLElement) {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const view = dialog?.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const caption = dialog?.querySelector<HTMLElement>('[data-lightbox-caption]');
  if (!dialog || !view || !caption) return () => {};
  let source: HTMLImageElement | null = null;

  // Animates the enlarged image from/to the thumbnail's position (transform only).
  const flip = (from: DOMRect, to: DOMRect, reverse = false) => {
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = from.width / to.width;
    const frames = [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: 'none' }];
    return view.animate(reverse ? frames.reverse() : frames, { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  };

  const open = (img: HTMLImageElement) => {
    source = img;
    view.src = img.currentSrc || img.src;
    view.alt = img.alt;
    caption.textContent = img.closest('figure')?.querySelector('figcaption')?.textContent ?? img.alt;
    dialog.showModal();
    if (!reduceMotion()) flip(img.getBoundingClientRect(), view.getBoundingClientRect());
  };
  const close = async () => {
    if (!dialog.open) return;
    if (source && !reduceMotion()) {
      dialog.dataset.closing = '';
      await flip(source.getBoundingClientRect(), view.getBoundingClientRect(), true).finished.catch(() => {});
      delete dialog.dataset.closing;
    }
    dialog.close();
    source?.focus?.();
  };

  const onArticleClick = (event: MouseEvent) => {
    const img = (event.target as Element).closest<HTMLImageElement>('img');
    if (!img || img.closest('a') || !article.contains(img)) return;
    open(img);
  };
  const onDialogClick = () => close();
  const onCancel = (event: Event) => {
    event.preventDefault();
    close();
  };
  article.addEventListener('click', onArticleClick);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('cancel', onCancel);
  // Keyboard users: images can be focused and opened with Enter.
  article.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    if (img.closest('a')) return;
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Enlarge image: ${img.alt}`);
  });
  const onKey = (event: KeyboardEvent) => {
    const img = event.target as HTMLElement;
    if (event.key === 'Enter' && img instanceof HTMLImageElement && article.contains(img)) open(img);
  };
  article.addEventListener('keydown', onKey);
  return () => {
    article.removeEventListener('click', onArticleClick);
    article.removeEventListener('keydown', onKey);
    dialog.removeEventListener('click', onDialogClick);
    dialog.removeEventListener('cancel', onCancel);
  };
}

// ---- Copy buttons, heading links, back to top ---------------------------------------------------

function clicks() {
  const onClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const code = target.closest<HTMLElement>('[data-copy-code]');
    if (code) {
      const pre = code.closest('.code-frame')?.querySelector('pre code');
      // Lines removed in a diff aren't part of the final code.
      const lines = [...(pre?.querySelectorAll<HTMLElement>('.line') ?? [])].filter((l) => !l.classList.contains('remove'));
      return copy(lines.map((l) => l.textContent).join('\n'), 'Code copied', code);
    }
    const text = target.closest<HTMLElement>('[data-copy-text]');
    if (text) return copy(text.dataset.copyText ?? '', text.dataset.copyMessage ?? 'Copied', text);
    const anchor = target.closest<HTMLAnchorElement>('.heading-anchor');
    if (anchor) copy(new URL(anchor.hash, location.href).href, 'Link to section copied');
    if (target.closest('[data-back-to-top]')) {
      event.preventDefault();
      scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

export function initPost(): () => void {
  const article = document.querySelector<HTMLElement>('.article');
  if (!article) return () => {};
  const cleanups = [trackProgress(article), sidenotes(article), lightbox(article), clicks()];
  return () => cleanups.forEach((fn) => fn());
}
