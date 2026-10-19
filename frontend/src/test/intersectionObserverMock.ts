/**
 * Controllable IntersectionObserver for load-more tests (jsdom has none).
 * `triggerIntersection()` reports every currently observed element as intersecting.
 */
type Instance = {
  callback: IntersectionObserverCallback;
  elements: Set<Element>;
  observer: IntersectionObserver;
};

const instances = new Set<Instance>();

class MockIntersectionObserver {
  private instance: Instance;

  constructor(callback: IntersectionObserverCallback) {
    this.instance = {
      callback,
      elements: new Set(),
      observer: this as unknown as IntersectionObserver,
    };
    instances.add(this.instance);
  }

  observe(element: Element) {
    this.instance.elements.add(element);
  }

  unobserve(element: Element) {
    this.instance.elements.delete(element);
  }

  disconnect() {
    this.instance.elements.clear();
    instances.delete(this.instance);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  root = null;
  rootMargin = '';
  thresholds = [0];
}

let original: typeof IntersectionObserver | undefined;

export function installIntersectionObserverMock(): void {
  original = (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
}

export function uninstallIntersectionObserverMock(): void {
  instances.clear();
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = original;
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = original;
}

/** Number of elements currently observed whose test id matches. */
export function observedTestIds(): string[] {
  const ids: string[] = [];
  instances.forEach((instance) => {
    instance.elements.forEach((element) => {
      const id = element.getAttribute('data-testid');
      if (id) ids.push(id);
    });
  });
  return ids;
}

export function triggerIntersection(testId?: string): void {
  Array.from(instances).forEach((instance) => {
    const targets = Array.from(instance.elements).filter(
      (element) => !testId || element.getAttribute('data-testid') === testId
    );
    if (targets.length === 0) return;
    instance.callback(
      targets.map(
        (target) =>
          ({
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            time: 0,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
          }) as IntersectionObserverEntry
      ),
      instance.observer
    );
  });
}
