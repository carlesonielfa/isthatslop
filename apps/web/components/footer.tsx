export function Footer() {
  return (
    <footer className="ring mt-8 text-secondary">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-wrap justify-between items-center gap-4 text-xs">
          <div className="flex gap-4">
            <a href="/about" className="hover:text-foreground">
              About
            </a>
            <a href="/faq" className="hover:text-foreground">
              FAQ
            </a>
            <a href="/api" className="hover:text-foreground">
              API
            </a>
            <a href="/contact" className="hover:text-foreground">
              Contact
            </a>
          </div>
          <div>IsThatSlop.com - 2026</div>
        </div>
      </div>
    </footer>
  );
}
