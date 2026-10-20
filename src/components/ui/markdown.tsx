import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Concept explanations are written in Markdown (src/content/concepts.ts). Spanish in
// them is italicised by convention, so <em> is marked lang="es".
const components: Components = {
  p: ({ children }) => <p className="m-0 text-[17px] leading-relaxed text-fg-soft">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }) => (
    <em lang="es" className="text-fg not-italic">
      {children}
    </em>
  ),
  ul: ({ children }) => <ul className="m-0 flex list-none flex-col gap-2 p-0">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 flex flex-col gap-2 pl-5 text-fg-soft">{children}</ol>,
  li: ({ children }) => (
    <li className="relative pl-5 text-[16px] leading-relaxed text-fg-soft before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-accent/70">
      {children}
    </li>
  ),
  table: ({ children }) => (
    <div className="glass-subtle overflow-x-auto rounded-2xl">
      <table className="w-full border-collapse text-[15px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="px-4 py-2.5 text-left font-mono text-xs font-normal text-fg-muted">{children}</th>,
  td: ({ children }) => <td className="border-t border-white/[0.06] px-4 py-2.5 text-fg-soft">{children}</td>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
